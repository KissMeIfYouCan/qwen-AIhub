#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试API接口
"""

import requests
import json
from datetime import datetime

def test_api():
    """测试API接口"""

    api_base = "http://localhost:8002"

    print("测试API接口...")

    # 1. 测试健康检查
    try:
        response = requests.get(f"{api_base}/api/health")
        print(f"健康检查: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"健康检查失败: {e}")
        return

    # 2. 创建光照传感器设备
    device_data = {
        "id": "LIGHT_001",
        "name": "光照传感器",
        "type": "sensor",
        "location": "车间A-监控点1",
        "status": "online",
        "last_update": datetime.now().isoformat(),
        "parameters": {
            "sensor_type": "light",
            "measurement_range": "0-2000 lux",
            "accuracy": "±5%"
        }
    }

    try:
        response = requests.post(f"{api_base}/api/devices", json=device_data)
        print(f"设备创建: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"设备创建成功: {response.json()}")
        else:
            print(f"设备创建失败: {response.text}")
    except Exception as e:
        print(f"设备创建错误: {e}")

    # 3. 导入传感器数据
    sensor_readings = [
        {'R0': 4591, 'R1': 4000, 'value': 738.75},
        {'R0': 4791, 'R1': 4000, 'value': 988.75},
        {'R0': 4450, 'R1': 4000, 'value': 562.5},
        {'R0': 4320, 'R1': 4000, 'value': 400.0},
        {'R0': 4680, 'R1': 4000, 'value': 850.0}
    ]

    print(f"\n导入 {len(sensor_readings)} 条传感器数据...")

    success_count = 0
    for i, reading in enumerate(sensor_readings):
        sensor_data = {
            "timestamp": datetime.now().isoformat(),
            "sensor_id": "LIGHT_001",
            "sensor_name": "光照传感器",
            "sensor_type": "light",
            "location": "车间A-监控点1",
            "raw_data": {
                "R0": reading['R0'],
                "R1": reading['R1']
            },
            "processed_value": reading['value'],
            "unit": "lux",
            "status": "normal" if 300 <= reading['value'] <= 1000 else "warning"
        }

        try:
            response = requests.post(f"{api_base}/api/sensor-data", json=sensor_data)
            if response.status_code in [200, 201]:
                success_count += 1
                print(f"数据点 {i+1}: 成功 ({reading['value']} lux)")
            else:
                print(f"数据点 {i+1}: 失败 - {response.status_code} - {response.text}")
        except Exception as e:
            print(f"数据点 {i+1}: 错误 - {e}")

    print(f"\n导入完成: {success_count}/{len(sensor_readings)} 条数据成功")

    # 4. 查看设备列表
    try:
        response = requests.get(f"{api_base}/api/devices")
        if response.status_code == 200:
            devices = response.json()
            print(f"\n当前设备列表 ({devices['total']} 个):")
            for device in devices['devices']:
                print(f"  - {device['id']}: {device['name']} ({device['status']})")
        else:
            print(f"获取设备列表失败: {response.status_code}")
    except Exception as e:
        print(f"获取设备列表错误: {e}")

    # 5. 查看传感器数据
    try:
        response = requests.get(f"{api_base}/api/sensor-data?sensor_id=LIGHT_001&limit=5")
        if response.status_code == 200:
            data = response.json()
            print(f"\n传感器数据 ({data['total']} 条):")
            for item in data['data']:
                print(f"  - {item['timestamp']}: {item['processed_value']} {item['unit']} ({item['status']})")
        else:
            print(f"获取传感器数据失败: {response.status_code}")
    except Exception as e:
        print(f"获取传感器数据错误: {e}")

if __name__ == "__main__":
    test_api()