#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的传感器数据导入测试脚本
"""

import json
import requests
from datetime import datetime, timedelta

def test_data_parsing():
    """测试数据解析"""
    test_line = "[响应] 寄存器: [4591, 4000]\n[数据] R0=4591, R1=4000, 计算值=738.75"

    print("测试行: {}".format(test_line))

    if '[响应] 寄存器:' in test_line and '[数据]' in test_line:
        try:
            # 提取寄存器值
            reg_start = test_line.find('[') + 1
            reg_end = test_line.find(']', reg_start)
            reg_values = test_line[reg_start:reg_end]
            r0, r1 = map(int, reg_values.split(', '))

            # 提取计算值
            calc_start = test_line.find('计算值=') + 4
            calc_value = float(test_line[calc_start:])

            print("解析成功: R0={}, R1={}, 计算值={}".format(r0, r1, calc_value))
            return True
        except Exception as e:
            print("解析失败: {}".format(e))
            return False
    else:
        print("模式不匹配")
        return False

def test_api_connection():
    """测试API连接"""
    try:
        response = requests.get("http://localhost:8001/api/health")
        print("API健康检查: {} - {}".format(response.status_code, response.json()))
        return response.status_code == 200
    except Exception as e:
        print("API连接失败: {}".format(e))
        return False

def test_device_creation():
    """测试设备创建"""
    device_data = {
        'id': 'LIGHT_001',
        'name': '光照传感器',
        'type': 'sensor',
        'location': '车间A-监控点1',
        'status': 'online',
        'last_update': datetime.now().isoformat(),
        'parameters': {
            'sensor_type': 'light',
            'measurement_range': '0-2000 lux'
        }
    }

    try:
        response = requests.post("http://localhost:8001/api/devices", json=device_data)
        print("设备创建: {} - {}".format(response.status_code, response.text))
        return response.status_code in [200, 201]
    except Exception as e:
        print("设备创建失败: {}".format(e))
        return False

def test_sensor_data_creation():
    """测试传感器数据创建"""
    sensor_data = {
        'timestamp': datetime.now().isoformat(),
        'sensor_id': 'LIGHT_001',
        'sensor_name': '光照传感器',
        'sensor_type': 'light',
        'location': '车间A-监控点1',
        'raw_data': {'R0': 4591, 'R1': 4000},
        'processed_value': 738.75,
        'unit': 'lux',
        'status': 'normal'
    }

    try:
        response = requests.post("http://localhost:8001/api/sensor-data", json=sensor_data)
        print("传感器数据创建: {} - {}".format(response.status_code, response.text))
        return response.status_code in [200, 201]
    except Exception as e:
        print("传感器数据创建失败: {}".format(e))
        return False

def main():
    print("开始传感器数据导入测试...")

    print("\n1. 测试数据解析:")
    test_data_parsing()

    print("\n2. 测试API连接:")
    if not test_api_connection():
        print("API服务未运行，请先启动后端服务")
        return

    print("\n3. 测试设备创建:")
    test_device_creation()

    print("\n4. 测试传感器数据创建:")
    test_sensor_data_creation()

    print("\n测试完成!")

if __name__ == "__main__":
    main()