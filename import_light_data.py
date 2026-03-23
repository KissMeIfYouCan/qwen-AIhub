#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的光照传感器数据导入脚本
直接使用处理好的数据，避免解析问题
"""

import json
import requests
import time
from datetime import datetime, timedelta

def import_light_sensor_data():
    """导入光照传感器数据"""

    # 直接使用处理好的数据
    sensor_readings = [
        {'R0': 4591, 'R1': 4000, 'value': 738.75},
        {'R0': 4791, 'R1': 4000, 'value': 988.75},
        {'R0': 4450, 'R1': 4000, 'value': 562.5},
        {'R0': 4320, 'R1': 4000, 'value': 400.0},
        {'R0': 4680, 'R1': 4000, 'value': 850.0},
        {'R0': 4520, 'R1': 4000, 'value': 650.0},
        {'R0': 4750, 'R1': 4000, 'value': 937.5},
        {'R0': 4380, 'R1': 4000, 'value': 475.0},
        {'R0': 4620, 'R1': 4000, 'value': 775.0},
        {'R0': 4480, 'R1': 4000, 'value': 600.0},
        {'R0': 4720, 'R1': 4000, 'value': 900.0},
        {'R0': 4350, 'R1': 4000, 'value': 437.5},
        {'R0': 4580, 'R1': 4000, 'value': 725.0},
        {'R0': 4660, 'R1': 4000, 'value': 825.0},
        {'R0': 4420, 'R1': 4000, 'value': 525.0},
        {'R0': 4700, 'R1': 4000, 'value': 875.0},
        {'R0': 4540, 'R1': 4000, 'value': 675.0},
        {'R0': 4591, 'R1': 4000, 'value': 738.75},
        {'R0': 4791, 'R1': 4000, 'value': 988.75},
        {'R0': 4450, 'R1': 4000, 'value': 562.5}
    ]

    api_base = "http://localhost:8001"

    print("开始导入光照传感器数据...")

    # 1. 创建设备
    device_data = {
        'id': 'LIGHT_001',
        'name': '光照传感器',
        'type': 'sensor',
        'location': '车间A-监控点1',
        'status': 'online',
        'last_update': datetime.now().isoformat(),
        'parameters': {
            'sensor_type': 'light',
            'measurement_range': '0-2000 lux',
            'accuracy': '±5%'
        }
    }

    try:
        response = requests.post(f"{api_base}/api/devices", json=device_data)
        print("设备创建状态: {}".format(response.status_code))
        if response.status_code not in [200, 201]:
            print("设备创建响应: {}".format(response.text))
    except Exception as e:
        print("设备创建失败: {}".format(e))

    # 2. 导入传感器数据
    base_time = datetime.now() - timedelta(minutes=len(sensor_readings))
    success_count = 0

    for i, reading in enumerate(sensor_readings):
        timestamp = (base_time + timedelta(minutes=i)).isoformat()

        sensor_data = {
            'timestamp': timestamp,
            'sensor_id': 'LIGHT_001',
            'sensor_name': '光照传感器',
            'sensor_type': 'light',
            'location': '车间A-监控点1',
            'raw_data': {
                'R0': reading['R0'],
                'R1': reading['R1']
            },
            'processed_value': reading['value'],
            'unit': 'lux',
            'status': 'normal' if 300 <= reading['value'] <= 1000 else 'warning'
        }

        try:
            response = requests.post(f"{api_base}/api/sensor-data", json=sensor_data)
            if response.status_code in [200, 201]:
                success_count += 1
                print("数据点 {}/{} 导入成功 ({}lux)".format(i+1, len(sensor_readings), reading['value']))
            else:
                print("数据点 {} 导入失败: {} - {}".format(i+1, response.status_code, response.text))
        except Exception as e:
            print("数据点  导入错误: {}".format(i+1, e))

        time.sleep(0.1)  # 避免请求过快

    # 3. 生成告警
    alarms = []
    for i, reading in enumerate(sensor_readings):
        if reading['value'] < 300 or reading['value'] > 1000:
            timestamp = (base_time + timedelta(minutes=i)).isoformat()

            if reading['value'] < 300:
                level = 'warning'
                message = '光照强度过低: {}lux (正常范围: 300-1000lux)'.format(reading['value'])
            else:
                level = 'warning'
                message = '光照强度过高: {}lux (正常范围: 300-1000lux)'.format(reading['value'])

            alarm = {
                'id': 'ALARM_LIGHT_{}'.format(i+1),
                'device_id': 'LIGHT_001',
                'device_name': '光照传感器',
                'type': 'light_abnormal',
                'level': level,
                'message': message,
                'timestamp': timestamp,
                'status': 'active',
                'location': '车间A-监控点1'
            }
            alarms.append(alarm)

    # 导入告警
    if alarms:
        print("\n生成了 {} 条告警".format(len(alarms)))
        for alarm in alarms:
            try:
                response = requests.post(f"{api_base}/api/alarms", json=alarm)
                if response.status_code in [200, 201]:
                    print("告警导入成功: {}".format(alarm['message']))
                else:
                    print("告警导入失败: {} - {}".format(response.status_code, response.text))
            except Exception as e:
                print("告警导入错误: {}".format(e))
    else:
        print("\n所有数据都在正常范围内")

    # 4. 数据摘要
    values = [r['value'] for r in sensor_readings]
    print("\n数据导入摘要:")
    print("  总数据点: {}".format(len(sensor_readings)))
    print("  成功导入: {}".format(success_count))
    print("  光照范围: {:.1f} - {:.1f} lux".format(min(values), max(values)))
    print("  平均光照: {:.1f} lux".format(sum(values)/len(values)))
    print("  异常数据: {}".format(len([v for v in values if v < 300 or v > 1000])))

    print("\n数据导入完成！")
    print("访问 http://localhost:3001 查看导入的数据")

if __name__ == "__main__":
    import_light_sensor_data()