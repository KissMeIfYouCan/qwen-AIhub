from __future__ import annotations

import random
import socket
import struct
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class GatewayConfig:
    modbus_host: str = "172.1.1.100"
    modbus_port: int = 502
    register_address: int = 3502
    register_quantity: int = 2
    device_id: str = "1421801"
    device_name: str = "新大陆Modbus网关"
    location: str = "默认监测点"


class ModbusClient:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port

    def read_registers(self, address: int, quantity: int) -> Optional[List[int]]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((self.host, self.port))

            transaction_id = random.randint(1, 65535)
            command = struct.pack(">HHHBBHH", transaction_id, 0, 6, 1, 0x04, address, quantity)
            sock.sendall(command)
            response = sock.recv(1024)
            sock.close()

            if len(response) < 9 + quantity * 2:
                return None

            values: List[int] = []
            for index in range(quantity):
                value = struct.unpack(">H", response[9 + index * 2: 11 + index * 2])[0]
                values.append(value)
            return values
        except OSError:
            return None

    def write_coil(self, address: int, value: int) -> bool:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((self.host, self.port))

            transaction_id = random.randint(1, 65535)
            command = struct.pack(">HHHBBHH", transaction_id, 0, 6, 1, 0x05, address, value)
            sock.sendall(command)
            response = sock.recv(1024)
            sock.close()
            return len(response) >= 10 and response[7] == 0x05
        except OSError:
            return False


def convert_sensor_data(r0: int, r1: int) -> Tuple[float, float, float]:
    light = 1.25 * r0 - 5000
    temp = 4.375 * r1 / 1000 - 27.5
    humidity = 6.25 * r1 / 1000 - 25
    return light, temp, humidity


SENSOR_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "light": {
        "name": "光照传感器",
        "unit": "lux",
        "warning": {"low": 300, "high": 1000},
        "error": {"low": 100, "high": 1500},
    },
    "temperature": {
        "name": "温度传感器",
        "unit": "°C",
        "warning": {"low": 0, "high": 35},
        "error": {"low": -10, "high": 45},
    },
    "humidity": {
        "name": "湿度传感器",
        "unit": "%",
        "warning": {"low": 30, "high": 75},
        "error": {"low": 20, "high": 90},
    },
}


class GatewayAdapter:
    def __init__(self, config: GatewayConfig):
        self.config = config
        self.modbus = ModbusClient(config.modbus_host, config.modbus_port)

    def read_register_sample(self) -> Dict[str, int]:
        values = self.modbus.read_registers(self.config.register_address, self.config.register_quantity)
        if not values or len(values) < 2:
            raise RuntimeError("读取 Modbus 寄存器失败")
        return {"R0": values[0], "R1": values[1]}

    def build_payloads_from_registers(self, r0: int, r1: int) -> Dict[str, Any]:
        timestamp = datetime.now().isoformat()
        raw_data = {"R0": r0, "R1": r1}
        light, temperature, humidity = convert_sensor_data(r0, r1)
        sensor_values = {
            "light": light,
            "temperature": temperature,
            "humidity": humidity,
        }

        sensor_records = []
        alarm_records = []
        device_statuses = []

        for sensor_type, value in sensor_values.items():
            status = self._get_status(sensor_type, value)
            device_statuses.append(status)
            sensor_id = f"{self.config.device_id}_{sensor_type}"
            sensor_records.append(
                {
                    "timestamp": timestamp,
                    "sensor_id": sensor_id,
                    "sensor_name": f"{self.config.device_name}-{SENSOR_DEFINITIONS[sensor_type]['name']}",
                    "sensor_type": sensor_type,
                    "location": self.config.location,
                    "raw_data": raw_data,
                    "processed_value": round(value, 2),
                    "unit": SENSOR_DEFINITIONS[sensor_type]["unit"],
                    "status": status,
                    "device_id": self.config.device_id,
                }
            )
            if status in {"warning", "error"}:
                alarm_records.append(
                    {
                        "id": f"alarm_{uuid.uuid4().hex[:12]}",
                        "device_id": self.config.device_id,
                        "device_name": self.config.device_name,
                        "type": f"{sensor_type}_abnormal",
                        "level": "critical" if status == "error" else "warning",
                        "message": self._build_alarm_message(sensor_type, value, status),
                        "timestamp": timestamp,
                        "status": "active",
                        "location": self.config.location,
                    }
                )

        device = {
            "id": self.config.device_id,
            "name": self.config.device_name,
            "type": "sensor",
            "location": self.config.location,
            "status": self._merge_device_status(device_statuses),
            "last_update": timestamp,
            "parameters": {
                "gateway_host": self.config.modbus_host,
                "gateway_port": self.config.modbus_port,
                "register_address": self.config.register_address,
                "register_quantity": self.config.register_quantity,
                "channels": list(sensor_values.keys()),
            },
        }

        return {
            "device": device,
            "sensor_data": sensor_records,
            "alarms": alarm_records,
        }

    def poll(self) -> Dict[str, Any]:
        raw = self.read_register_sample()
        return self.build_payloads_from_registers(raw["R0"], raw["R1"])

    def _get_status(self, sensor_type: str, value: float) -> str:
        thresholds = SENSOR_DEFINITIONS[sensor_type]
        error = thresholds["error"]
        warning = thresholds["warning"]
        if value < error["low"] or value > error["high"]:
            return "error"
        if value < warning["low"] or value > warning["high"]:
            return "warning"
        return "normal"

    def _build_alarm_message(self, sensor_type: str, value: float, status: str) -> str:
        label = SENSOR_DEFINITIONS[sensor_type]["name"]
        unit = SENSOR_DEFINITIONS[sensor_type]["unit"]
        level_text = "严重异常" if status == "error" else "预警"
        return f"{label}{level_text}: {round(value, 2)} {unit}"

    def _merge_device_status(self, statuses: List[str]) -> str:
        if "error" in statuses:
            return "fault"
        if "warning" in statuses:
            return "maintenance"
        return "online"


def build_sample_payloads(r0: int, r1: int, config: Optional[GatewayConfig] = None) -> Dict[str, Any]:
    adapter = GatewayAdapter(config or GatewayConfig())
    return adapter.build_payloads_from_registers(r0, r1)
