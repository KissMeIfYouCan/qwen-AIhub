#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入完整的光照传感器数据
"""

import requests
import json
from datetime import datetime, timedelta

def import_full_sensor_data():
    """导入完整的传感器数据"""

    api_base = "http://localhost:8002"

    # 完整的光照传感器数据
    sensor_readings = [
        {'R0': 4591, 'R1': 4000, 'value': 738.75, 'time': '18:00'},
        {'R0': 4791, 'R1': 4000, 'value': 988.75, 'time': '18:01'},
        {'R0': 4450, 'R1': 4000, 'value': 562.5, 'time': '18:02'},
        {'R0': 4320, 'R1': 4000, 'value': 400.0, 'time': '18:03'},
        {'R0': 4680, 'R1': 4000, 'value': 850.0, 'time': '18:04'},
        {'R0': 4520, 'R1': 4000, 'value': 650.0, 'time': '18:05'},
        {'R0': 4750, 'R1': 4000, 'value': 937.5, 'time': '18:06'},
        {'R0': 4380, 'R1': 4000, 'value': 475.0, 'time': '18:07'},
        {'R0': 4620, 'R1': 4000, 'value': 775.0, 'time': '18:08'},
        {'R0': 4480, 'R1': 4000, 'value': 600.0, 'time': '18:09'},
        {'R0': 4720, 'R1': 4000, 'value': 900.0, 'time': '18:10'},
        {'R0': 4350, 'R1': 4000, 'value': 437.5, 'time': '18:11'},
        {'R0': 4580, 'R1': 4000, 'value': 725.0, 'time': '18:12'},
        {'R0': 4660, 'R1': 4000, 'value': 825.0, 'time': '18:13'},
        {'R0': 4420, 'R1': 4000, 'value': 525.0, 'time': '18:14'},
        {'R0': 4700, 'R1': 4000, 'value': 875.0, 'time': '18:15'},
        {'R0': 4540, 'R1': 4000, 'value': 675.0, 'time': '18:16'},
        {'R0': 4591, 'R1': 4000, 'value': 738.75, 'time': '18:17'},
        {'R0': 4791, 'R1': 4000, 'value': 988.75, 'time': '18:18'},
        {'R0': 4450, 'R1': 4000, 'value': 562.5, 'time': '18:19'}
    ]

    print(f"开始导入完整的光照传感器数据 ({len(sensor_readings)} 条)...")

    # 使用今天的日期，但使用数据中的时间
    base_date = datetime.now().date()
    success_count = 0

    for i, reading in enumerate(sensor_readings):
        # 解析时间
        hour, minute = map(int, reading['time'].split(':'))
        timestamp = datetime.combine(base_date, datetime.min.time().replace(hour=hour, minute=minute))

        sensor_data = {
            "timestamp": timestamp.isoformat(),
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
                status = "正常" if sensor_data['status'] == 'normal' else "异常"
                print(f"数据点 {i+1:2d}: {reading['time']} - {reading['value']:6.1f} lux ({status})")
            else:
                print(f"数据点 {i+1:2d}: 失败 - {response.status_code}")
        except Exception as e:
            print(f"数据点 {i+1:2d}: 错误 - {e}")

    print(f"\n导入完成: {success_count}/{len(sensor_readings)} 条数据成功")

    # 统计信息
    values = [r['value'] for r in sensor_readings]
    print(f"\n数据统计:")
    print(f"  光照范围: {min(values):.1f} - {max(values):.1f} lux")
    print(f"  平均光照: {sum(values)/len(values):.1f} lux")
    print(f"  正常数据: {len([v for v in values if 300 <= v <= 1000])} 条")
    print(f"  异常数据: {len([v for v in values if v < 300 or v > 1000])} 条")

    # 查看最新数据
    try:
        response = requests.get(f"{api_base}/api/sensor-data/latest")
        if response.status_code == 200:
            data = response.json()
            print(f"\n最新传感器数据摘要:")
            print(f"  数据点数: {data['summary']['count']}")
            print(f"  平均值: {data['summary']['avg_value']:.1f} lux")
            print(f"  范围: {data['summary']['min_value']:.1f} - {data['summary']['max_value']:.1f} lux")
            print(f"  正常: {data['summary']['normal_count']} 条")
            print(f"  异常: {data['summary']['warning_count']} 条")
    except Exception as e:
        print(f"获取最新数据失败: {e}")

    print(f"\n✅ 光照传感器数据已成功导入后端API")
    print(f"📊 后端服务: http://localhost:8002")
    print(f"🌐 前端界面: http://localhost:3001")
    print(f"📖 API文档: http://localhost:8002/docs")

if __name__ == "__main__":
    import_full_sensor_data()