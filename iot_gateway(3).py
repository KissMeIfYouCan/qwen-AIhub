#!/usr/bin/env python3
"""
Modbus TCP 客户端 - 新大陆云平台对接程序

功能：
1. 读取IoT设备(Modbus)的传感器数据
2. 上报数据到新大陆云平台(NLECloud)
3. 接收云平台的控制命令，反向控制执行器
4. 保持TCP长连接，定时心跳维持在线状态
"""

import socket
import threading
import time
import logging
import requests
import struct
import random
import json
import sys
import select

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class Config:
    """配置参数"""
    MODBUS_HOST = '172.1.1.100'
    MODBUS_PORT = 502

    NLE_HOST = 'ndp.nlecloud.com'
    NLE_PORT = 8600
    DEVICE_TAG = '646585223'
    DEVICE_KEY = '68e8825668424b1c9123ca141bb02862'
    DEVICE_ID = '1421801'

    USERNAME = '13175440866'
    PASSWORD = '070725'

    MODBUS_ADDR_TEMP_HUM = 3502
    MODBUS_ADDR_DO3 = 4
    MODBUS_ADDR_DO6 = 6

    ACTUATOR_MAP = {
        'do_light': 4,
        'temp': 6,
    }

    UPLOAD_INTERVAL = 5
    HEARTBEAT_INTERVAL = 60
    CMD_POLL_INTERVAL = 3


class ModbusClient:
    """Modbus TCP 客户端"""

    def __init__(self, host, port):
        self.host = host
        self.port = port

    def read_registers(self, address, quantity):
        """读取保持寄存器"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((self.host, self.port))

            tid = random.randint(1, 65535)
            command = struct.pack('>HHHBBHH', tid, 0, 6, 1, 0x04, address, quantity)
            sock.sendall(command)

            response = sock.recv(1024)
            sock.close()

            if len(response) >= 9 + quantity * 2:
                values = []
                for i in range(quantity):
                    val = struct.unpack('>H', response[9 + i * 2: 11 + i * 2])[0]
                    values.append(val)
                return values
        except Exception as e:
            logger.error(f"[Modbus] 读取寄存器失败: {e}")
        return None

    def write_coil(self, address, value):
        """写单个线圈"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((self.host, self.port))

            tid = random.randint(1, 65535)
            command = struct.pack('>HHHBBHH', tid, 0, 6, 1, 0x05, address, value)
            sock.sendall(command)

            response = sock.recv(1024)
            sock.close()

            if len(response) >= 10 and response[7] == 0x05:
                logger.info(f"[Modbus] {'开启' if value == 0xFF00 else '关闭'} DO{address} 成功")
                return True
            else:
                logger.warning(f"[Modbus] {'开启' if value == 0xFF00 else '关闭'} DO{address} 失败")
        except Exception as e:
            logger.error(f"[Modbus] 写线圈失败: {e}")
        return False


class NLECloudClient:
    """新大陆云平台 TCP 客户端 - 统一连接管理"""

    def __init__(self, host, port, device_tag, device_key):
        self.host = host
        self.port = port
        self.device_tag = device_tag
        self.device_key = device_key
        self.sock = None
        self.connected = False
        self.running = True
        self.lock = threading.Lock()
        self.callback = None
        self.last_heartbeat = 0
        self.heartbeat_interval = 55

    def _close_socket(self):
        """安全关闭socket"""
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.sock = None
            self.connected = False

    def connect(self):
        """连接云平台"""
        with self.lock:
            try:
                self._close_socket()
                time.sleep(0.5)

                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(10)
                self.sock.connect((self.host, self.port))

                handshake = json.dumps({
                    "t": 1,
                    "device": self.device_tag,
                    "key": self.device_key,
                    "ver": "v1.0"
                })

                self.sock.sendall(handshake.encode() + b'\r\n')
                response = self.sock.recv(1024)

                resp_json = json.loads(response.decode().strip())
                if resp_json.get('status') == 0:
                    self.connected = True
                    self.last_heartbeat = time.time()
                    logger.info("[云平台] 连接成功")
                    return True
                else:
                    logger.error(f"[云平台] 连接失败: {response}")
            except Exception as e:
                logger.error(f"[云平台] 连接异常: {e}")

        self.connected = False
        return False

    def send_heartbeat(self):
        """发送心跳"""
        current_time = time.time()
        if current_time - self.last_heartbeat >= self.heartbeat_interval:
            if self.send_data({"t": 5}):
                self.last_heartbeat = current_time

    def send_data(self, data):
        """发送数据（线程安全）"""
        if not self.connected:
            if not self.connect():
                return False

        try:
            with self.lock:
                self.sock.sendall(json.dumps(data).encode() + b'\r\n')
                self.sock.settimeout(5)
                response = self.sock.recv(1024)
                return True
        except Exception as e:
            logger.warning(f"[云平台] 发送异常: {e}")
            self._close_socket()
            return False

    def upload_data(self, light, temp, humidity):
        """上报传感器数据"""
        for retry in range(3):
            try:
                data = {
                    "t": 3,
                    "datatype": 1,
                    "datas": {
                        "m_light": round(light, 1),
                        "m_temperature": round(temp, 1),
                        "m_humidity": round(humidity, 1)
                    }
                }

                if self.send_data(data):
                    logger.info(f"[云平台] 数据上报成功: 光照={light:.1f}, 温度={temp:.1f}, 湿度={humidity:.1f}")
                    return True

            except Exception as e:
                logger.warning(f"[云平台] 上报异常 (重试{retry+1}): {e}")
                self.connected = False
                time.sleep(1)

        logger.error(f"[云平台] 上报失败")
        return False

    def set_callback(self, callback):
        """设置命令回调"""
        self.callback = callback

    def receive_loop(self):
        """接收命令循环"""
        while self.running:
            try:
                if not self.connected:
                    if not self.connect():
                        time.sleep(2)
                        continue

                with self.lock:
                    self.sock.settimeout(2)
                    try:
                        ready, _, _ = select.select([self.sock], [], [], 1)
                        if ready:
                            response = self.sock.recv(4096)
                            if response:
                                msgs = response.decode().strip().split('\r\n')
                                for msg_str in msgs:
                                    if not msg_str:
                                        continue
                                    try:
                                        msg = json.loads(msg_str)
                                        msg_type = msg.get('t')

                                        if msg_type == 5:
                                            apitag = msg.get('apitag', '')
                                            cmd_data = msg.get('data')
                                            logger.info(f"[云平台] 收到命令: {apitag} = {cmd_data}")

                                            if self.callback:
                                                self.callback(apitag, cmd_data)
                                    except json.JSONDecodeError:
                                        pass
                    except socket.timeout:
                        pass

                self.send_heartbeat()

            except Exception as e:
                logger.warning(f"[云平台] 接收循环异常: {e}")
                self._close_socket()
                time.sleep(1)

    def stop(self):
        """停止"""
        self.running = False
        self._close_socket()


class NLECloudAPI:
    """新大陆云平台 HTTP API"""

    def __init__(self, device_id, username, password):
        self.device_id = device_id
        self.username = username
        self.password = password
        self.token = None

    def login(self):
        """登录获取Token"""
        try:
            resp = requests.post(
                'http://api.nlecloud.com/users/login',
                json={'Account': self.username, 'Password': self.password},
                timeout=10
            )
            result = resp.json()
            if result.get('Status') == 0:
                self.token = result['ResultObj']['AccessToken']
                logger.info("[HTTP] 登录成功")
                return True
        except Exception as e:
            logger.error(f"[HTTP] 登录失败: {e}")
        return False

    def poll_command(self, last_cmds, callback):
        """轮询设备命令"""
        try:
            if not self.token:
                if not self.login():
                    return last_cmds

            url = f'http://api.nlecloud.com/devices/{self.device_id}'
            headers = {'AccessToken': self.token}
            resp = requests.get(url, headers=headers, timeout=10)
            result = resp.json()

            if result.get('Status') == 0:
                sensors = result.get('ResultObj', {}).get('Sensors', [])
                for sensor in sensors:
                    apitag = sensor.get('ApiTag', '')
                    if apitag in ['do_light', 'temp']:
                        cmd_value = sensor.get('Value', '')

                        if apitag not in last_cmds:
                            last_cmds[apitag] = None

                        if cmd_value and str(cmd_value) != str(last_cmds[apitag]):
                            logger.info(f"[HTTP] 收到命令: {apitag} = {cmd_value}")
                            last_cmds[apitag] = cmd_value

                            try:
                                if isinstance(cmd_value, bool):
                                    if callback:
                                        callback(apitag, cmd_value)
                                else:
                                    cmd_data = json.loads(cmd_value)
                                    cmd_str = cmd_data.get('CmdStr', '').lower()
                                    if callback:
                                        callback(apitag, cmd_str == 'true')
                            except Exception as e:
                                logger.error(f"[HTTP] 命令解析错误: {e}")

        except Exception as e:
            logger.error(f"[HTTP] 命令轮询异常: {e}")
            if 'token' in str(e).lower() or 'unauthorized' in str(e).lower():
                self.token = None

        return last_cmds


def convert_sensor_data(r0, r1):
    """转换传感器数据"""
    light = 1.25 * r0 - 5000
    temp = 4.375 * r1 / 1000 - 27.5
    humidity = 6.25 * r1 / 1000 - 25
    return light, temp, humidity


def main():
    cfg = Config()

    modbus = ModbusClient(cfg.MODBUS_HOST, cfg.MODBUS_PORT)
    nle_tcp = NLECloudClient(cfg.NLE_HOST, cfg.NLE_PORT, cfg.DEVICE_TAG, cfg.DEVICE_KEY)
    nle_http = NLECloudAPI(cfg.DEVICE_ID, cfg.USERNAME, cfg.PASSWORD)

    last_cmds = {}

    def handle_command(apitag, cmd_data):
        """处理云平台TCP命令"""
        if apitag in cfg.ACTUATOR_MAP:
            modbus_addr = cfg.ACTUATOR_MAP[apitag]
            if cmd_data == 1 or cmd_data == True:
                modbus.write_coil(modbus_addr, 0xFF00)
            elif cmd_data == 0 or cmd_data == False:
                modbus.write_coil(modbus_addr, 0x0000)

    def http_handle_command(apitag, is_on):
        """处理HTTP轮询命令"""
        if apitag in cfg.ACTUATOR_MAP:
            modbus_addr = cfg.ACTUATOR_MAP[apitag]
            if is_on:
                modbus.write_coil(modbus_addr, 0xFF00)
            else:
                modbus.write_coil(modbus_addr, 0x0000)

    logger.info("=" * 50)
    logger.info("Modbus <-> 云平台 客户端 v2.0")
    logger.info(f"Modbus: {cfg.MODBUS_HOST}:{cfg.MODBUS_PORT}")
    logger.info(f"云平台: {cfg.NLE_HOST}:{cfg.NLE_PORT}")
    logger.info(f"设备标识: {cfg.DEVICE_TAG}")
    logger.info("=" * 50)

    nle_http.login()
    nle_tcp.connect()

    nle_tcp.set_callback(handle_command)

    cmd_tcp_t = threading.Thread(target=nle_tcp.receive_loop, daemon=True)
    cmd_tcp_t.start()
    logger.info("[线程] TCP命令接收+心跳已启动")

    cmd_http_t = threading.Thread(target=lambda: loop_http_poll(nle_http, http_handle_command), daemon=True)
    cmd_http_t.start()
    logger.info("[线程] HTTP命令轮询已启动")

    count = 0
    while True:
        try:
            count += 1
            logger.info(f"=== 第{count}次轮询 ===")

            values = modbus.read_registers(cfg.MODBUS_ADDR_TEMP_HUM, 2)
            if values and len(values) >= 2:
                r0, r1 = values[0], values[1]
                logger.info(f"[Modbus] R0={r0}, R1={r1}")

                light, temp, humidity = convert_sensor_data(r0, r1)
                nle_tcp.upload_data(light, temp, humidity)
            else:
                logger.warning("[Modbus] 读取失败")

            time.sleep(cfg.UPLOAD_INTERVAL)

        except Exception as e:
            logger.error(f"[主循环] 异常: {e}")
            time.sleep(5)


def loop_heartbeat(nle_client, cfg):
    """心跳循环"""
    while True:
        nle_client.send_heartbeat()
        time.sleep(cfg.HEARTBEAT_INTERVAL)


def loop_http_poll(nle_api, callback):
    """HTTP命令轮询循环"""
    last_cmds = {}
    while True:
        last_cmds = nle_api.poll_command(last_cmds, callback)
        time.sleep(3)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.info("程序已停止")
        sys.exit(0)
