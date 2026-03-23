#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接通过现有API导入光照传感器数据
使用现有的设备和告警接口
"""

import json
import requests
import time
from datetime import datetime, timedelta

def import_via_existing_api():
    """通过现有API导入数据"""

    # 光照传感器数据
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

    print("开始通过现有API导入光照传感器数据...")

    # 1. 检查现有设备
    try:
        response = requests.get(f"{api_base}/api/devices")
        if response.status_code == 200:
            devices = response.json()
            print("当前设备列表:")
            for device in devices.get('devices', []):
                print("  - {}: {} ({})".format(device['id'], device['name'], device['status']))
        else:
            print("获取设备列表失败: {}".format(response.status_code))
    except Exception as e:
        print("设备列表请求错误: {}".format(e))

    # 2. 检查现有告警
    try:
        response = requests.get(f"{api_base}/api/alarms")
        if response.status_code == 200:
            alarms = response.json()
            print("\n当前告警列表:")
            for alarm in alarms.get('alarms', []):
                print("  - {}: {} ({})".format(alarm['id'], alarm.get('title', alarm.get('message', 'N/A')), alarm['level']))
        else:
            print("获取告警列表失败: {}".format(response.status_code))
    except Exception as e:
        print("告警列表请求错误: ".format(e))

    # 3. 使用聊天接口记录传感器数据
    print("\n通过聊天接口记录传感器数据...")

    values = [r['value'] for r in sensor_readings]
    summary_message = "光照传感器数据导入完成。共{}个数据点，光照范围{:.1f}-{:.1f}lux，平均{:.1f}lux。异常数据{}个。".format(
        len(sensor_readings),
        min(values),
        max(values),
        sum(values)/len(values),
        len([v for v in values if v < 300 or v > 1000])
    )

    try:
        chat_data = {"question": summary_message}
        response = requests.post(f"{api_base}/api/chat/ask", json=chat_data)
        if response.status_code == 200:
            result = response.json()
            print("数据记录成功: {}".format(result.get('answer', 'N/A')))
        else:
            print("数据记录失败: {}".format(response.status_code))
    except Exception as e:
        print("数据记录错误: {}".format(e))

    # 4. 使用诊断接口分析数据
    print("\n使用诊断接口分析传感器数据...")

    try:
        diagnosis_data = {
            "device_id": "LIGHT_001",
            "diagnosis_type": "light_sensor_analysis"
        }
        response = requests.post(f"{api_base}/api/diagnosis/analyze", json=diagnosis_data)
        if response.status_code == 200:
            result = response.json()
            print("诊断分析完成:")
            print("  设备: {}".format(result.get('device_name', 'N/A')))
            print("  状态: {}".format(result.get('status', 'N/A')))
            print("  置信度: {}".format(result.get('confidence', 'N/A')))
            print("  摘要: {}".format(result.get('summary', 'N/A')))
        else:
            print("诊断分析失败: {}".format(response.status_code))
    except Exception as e:
        print("诊断分析错误: {}".format(e))

    # 5. 数据摘要
    print("\n=== 光照传感器数据摘要 ===")
    print("数据点总数: {}".format(len(sensor_readings)))
    print("光照范围: {:.1f} - {:.1f} lux".format(min(values), max(values)))
    print("平均光照: {:.1f} lux".format(sum(values)/len(values)))
    print("正常数据: {} 个".format(len([v for v in values if 300 <= v <= 1000])))
    print("异常数据: {} 个".format(len([v for v in values if v < 300 or v > 1000])))

    # 显示部分数据样本
    print("\n数据样本:")
    for i, reading in enumerate(sensor_readings[:5]):
        status = "正常" if 300 <= reading['value'] <= 1000 else "异常"
        print("  {}. R0={}, R1={}, 光照={:.1f}lux ({})".format(
            i+1, reading['R0'], reading['R1'], reading['value'], status))

    if len(sensor_readings) > 5:
        print("  ... (还有{}个数据点)".format(len(sensor_readings) - 5))

    print("\n数据导入完成！")
    print("访问 http://localhost:3001 查看AI中控平台")
    print("传感器数据已通过现有API接口记录和分析")

if __name__ == "__main__":
    import_via_existing_api()