#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
传感器数据导入脚本
将真实的光照传感器数据导入到AI中控平台
"""

import json
import requests
import time
from datetime import datetime, timedelta

class SensorDataImporter:
    def __init__(self, api_base_url="http://localhost:8001"):
        self.api_base_url = api_base_url
        self.sensor_data = []

    def parse_sensor_log(self, log_text):
        """解析传感器日志数据"""
        lines = log_text.strip().split('\n')

        base_time = datetime.now() - timedelta(minutes=len(lines))

        for i, line in enumerate(lines):
            if '[响应] 寄存器:' in line and '[数据]' in line:
                try:
                    # 提取寄存器值
                    reg_start = line.find('[') + 1
                    reg_end = line.find(']', reg_start)
                    reg_values = line[reg_start:reg_end]
                    r0, r1 = map(int, reg_values.split(', '))

                    # 提取计算值
                    calc_start = line.find('计算值=') + 4
                    calc_value = float(line[calc_start:])

                    # 创建数据点
                    data_point = {
                        'timestamp': (base_time + timedelta(minutes=i)).isoformat(),
                        'sensor_id': 'LIGHT_001',
                        'sensor_name': '光照传感器',
                        'sensor_type': 'light',
                        'location': '车间A-监控点1',
                        'raw_data': {
                            'R0': r0,
                            'R1': r1
                        },
                        'processed_value': calc_value,
                        'unit': 'lux',
                        'status': 'normal' if 300 <= calc_value <= 1000 else 'warning'
                    }

                    self.sensor_data.append(data_point)

                except (ValueError, IndexError) as e:
                    print(f"解析错误 - 行 {i+1}: {e}")
                    continue

    def create_device_if_not_exists(self):
        """创建光照传感器设备"""
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
                'accuracy': '±5%',
                'response_time': '1s'
            }
        }

        try:
            response = requests.post(f"{self.api_base_url}/api/devices", json=device_data)
            if response.status_code in [200, 201]:
                print("光照传感器设备创建成功")
            else:
                print("设备创建响应: {}".format(response.status_code))
        except requests.exceptions.RequestException as e:
            print("设备创建失败: {}".format(e))

    def import_sensor_data(self):
        """导入传感器数据"""
        print("开始导入 {} 条传感器数据...".format(len(self.sensor_data)))

        success_count = 0
        for i, data_point in enumerate(self.sensor_data):
            try:
                response = requests.post(f"{self.api_base_url}/api/sensor-data", json=data_point)
                if response.status_code in [200, 201]:
                    success_count += 1
                    print("数据点 {}/{} 导入成功".format(i+1, len(self.sensor_data)))
                else:
                    print("数据点 {} 导入失败: {}".format(i+1, response.status_code))

                # 避免请求过快
                time.sleep(0.1)

            except requests.exceptions.RequestException as e:
                print("数据点 {} 导入错误: {}".format(i+1, e))

        print("\n导入完成: {}/{} 条数据成功".format(success_count, len(self.sensor_data)))

    def generate_alarms_from_data(self):
        """根据数据生成告警"""
        alarms = []

        for data_point in self.sensor_data:
            value = data_point['processed_value']

            # 光照异常检测
            if value < 200:
                alarm = {
                    'id': f"ALARM_{data_point['timestamp'].replace(':', '').replace('-', '').replace('.', '')}",
                    'device_id': data_point['sensor_id'],
                    'device_name': data_point['sensor_name'],
                    'type': 'light_low',
                    'level': 'warning',
                    'message': f'光照强度过低: {value} lux (正常范围: 300-1000 lux)',
                    'timestamp': data_point['timestamp'],
                    'status': 'active',
                    'location': data_point['location']
                }
                alarms.append(alarm)
            elif value > 1200:
                alarm = {
                    'id': f"ALARM_{data_point['timestamp'].replace(':', '').replace('-', '').replace('.', '')}",
                    'device_id': data_point['sensor_id'],
                    'device_name': data_point['sensor_name'],
                    'type': 'light_high',
                    'level': 'warning',
                    'message': f'光照强度过高: {value} lux (正常范围: 300-1000 lux)',
                    'timestamp': data_point['timestamp'],
                    'status': 'active',
                    'location': data_point['location']
                }
                alarms.append(alarm)

        # 导入告警
        if alarms:
            print("\n生成了 {} 条告警，开始导入...".format(len(alarms)))
            for alarm in alarms:
                try:
                    response = requests.post(f"{self.api_base_url}/api/alarms", json=alarm)
                    if response.status_code in [200, 201]:
                        print("告警导入成功: {}".format(alarm['message']))
                    else:
                        print("告警导入失败: {}".format(response.status_code))
                except requests.exceptions.RequestException as e:
                    print("告警导入错误: {}".format(e))
        else:
            print("\n所有数据都在正常范围内，无需生成告警")

    def print_data_summary(self):
        """打印数据摘要"""
        if not self.sensor_data:
            print("没有解析到有效数据")
            return

        values = [d['processed_value'] for d in self.sensor_data]

        print("\n数据摘要:")
        print("   数据点数量: {}".format(len(self.sensor_data)))
        print("   时间范围: {} ~ {}".format(self.sensor_data[0]['timestamp'], self.sensor_data[-1]['timestamp']))
        print("   光照强度范围: {:.2f} ~ {:.2f} lux".format(min(values), max(values)))
        print("   平均光照强度: {:.2f} lux".format(sum(values)/len(values)))
        print("   异常数据点: {}".format(len([v for v in values if v < 300 or v > 1000])))

def main():
    # 你的传感器数据
    sensor_log = """=== 第1次请求 ===
[响应] 寄存器: [4591, 4000]
[数据] R0=4591, R1=4000, 计算值=738.75

=== 第2次请求 ===
[响应] 寄存器: [4791, 4000]
[数据] R0=4791, R1=4000, 计算值=988.75

=== 第3次请求 ===
[响应] 寄存器: [4450, 4000]
[数据] R0=4450, R1=4000, 计算值=562.5

=== 第4次请求 ===
[响应] 寄存器: [4320, 4000]
[数据] R0=4320, R1=4000, 计算值=400.0

=== 第5次请求 ===
[响应] 寄存器: [4680, 4000]
[数据] R0=4680, R1=4000, 计算值=850.0

=== 第6次请求 ===
[响应] 寄存器: [4520, 4000]
[数据] R0=4520, R1=4000, 计算值=650.0

=== 第7次请求 ===
[响应] 寄存器: [4750, 4000]
[数据] R0=4750, R1=4000, 计算值=937.5

=== 第8次请求 ===
[响应] 寄存器: [4380, 4000]
[数据] R0=4380, R1=4000, 计算值=475.0

=== 第9次请求 ===
[响应] 寄存器: [4620, 4000]
[数据] R0=4620, R1=4000, 计算值=775.0

=== 第10次请求 ===
[响应] 寄存器: [4480, 4000]
[数据] R0=4480, R1=4000, 计算值=600.0

=== 第11次请求 ===
[响应] 寄存器: [4720, 4000]
[数据] R0=4720, R1=4000, 计算值=900.0

=== 第12次请求 ===
[响应] 寄存器: [4350, 4000]
[数据] R0=4350, R1=4000, 计算值=437.5

=== 第13次请求 ===
[响应] 寄存器: [4580, 4000]
[数据] R0=4580, R1=4000, 计算值=725.0

=== 第14次请求 ===
[响应] 寄存器: [4660, 4000]
[数据] R0=4660, R1=4000, 计算值=825.0

=== 第15次请求 ===
[响应] 寄存器: [4420, 4000]
[数据] R0=4420, R1=4000, 计算值=525.0

=== 第16次请求 ===
[响应] 寄存器: [4700, 4000]
[数据] R0=4700, R1=4000, 计算值=875.0

=== 第17次请求 ===
[响应] 寄存器: [4540, 4000]
[数据] R0=4540, R1=4000, 计算值=675.0

=== 第18次请求 ===
[响应] 寄存器: [4591, 4000]
[数据] R0=4591, R1=4000, 计算值=738.75

=== 第19次请求 ===
[响应] 寄存器: [4791, 4000]
[数据] R0=4791, R1=4000, 计算值=988.75

=== 第20次请求 ===
[响应] 寄存器: [4450, 4000]
[数据] R0=4450, R1=4000, 计算值=562.5"""

    print("启动传感器数据导入程序...")

    # 创建导入器
    importer = SensorDataImporter()

    # 解析数据
    print("解析传感器日志数据...")
    importer.parse_sensor_log(sensor_log)

    # 打印摘要
    importer.print_data_summary()

    # 创建设备
    print("\n创建传感器设备...")
    importer.create_device_if_not_exists()

    # 导入数据
    print("\n导入传感器数据...")
    importer.import_sensor_data()

    # 生成告警
    print("\n检查并生成告警...")
    importer.generate_alarms_from_data()

    print("\n数据导入完成！")
    print("现在可以访问 http://localhost:3001 查看导入的数据")

if __name__ == "__main__":
    main()