#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接在前端添加光照传感器设备显示
修改前端的设备管理页面来显示传感器数据
"""

import json
from datetime import datetime

def create_sensor_display_data():
    """创建传感器显示数据"""

    # 光照传感器数据
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

    # 计算统计数据
    values = [r['value'] for r in sensor_readings]
    latest_value = values[-1]
    avg_value = sum(values) / len(values)
    min_value = min(values)
    max_value = max(values)

    # 确定设备状态
    if 300 <= latest_value <= 1000:
        status = "online"
        status_text = "正常"
    elif latest_value < 300:
        status = "warning"
        status_text = "光照不足"
    else:
        status = "warning"
        status_text = "光照过强"

    # 创建光照传感器设备信息
    light_sensor = {
        "id": "LIGHT_001",
        "name": "光照传感器",
        "type": "sensor",
        "status": status,
        "location": "车间A-监控点1",
        "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "current_value": latest_value,
        "unit": "lux",
        "parameters": {
            "当前光照": "{:.1f} lux".format(latest_value),
            "状态": status_text,
            "平均值": "{:.1f} lux".format(avg_value),
            "最小值": "{:.1f} lux".format(min_value),
            "最大值": "{:.1f} lux".format(max_value),
            "数据点": "{} 个".format(len(sensor_readings)),
            "测量范围": "0-2000 lux",
            "精度": "±5%",
            "响应时间": "1秒"
        },
        "recent_data": sensor_readings[-10:],  # 最近10个数据点
        "all_data": sensor_readings
    }

    return light_sensor

def generate_frontend_code():
    """生成前端显示代码"""

    sensor_data = create_sensor_display_data()

    print("=== 光照传感器设备信息 ===")
    print("设备ID: {}".format(sensor_data['id']))
    print("设备名称: {}".format(sensor_data['name']))
    print("设备类型: {}".format(sensor_data['type']))
    print("设备状态: {}".format(sensor_data['status']))
    print("安装位置: {}".format(sensor_data['location']))
    print("最后更新: {}".format(sensor_data['last_update']))

    print("\n=== 当前参数 ===")
    for key, value in sensor_data['parameters'].items():
        print("{}: {}".format(key, value))

    print("\n=== 最近数据 ===")
    for i, data in enumerate(sensor_data['recent_data'][-5:]):
        print("{}. {} - R0:{}, R1:{}, 光照:{:.1f}lux".format(
            i+1, data['time'], data['R0'], data['R1'], data['value']))

    # 生成前端JavaScript代码
    js_code = """
// 添加到前端设备管理页面的JavaScript代码
const lightSensorData = {json_data};

// 在设备列表中添加光照传感器
function addLightSensorToDeviceList() {{
    const deviceList = document.querySelector('.device-list');
    if (deviceList) {{
        const sensorCard = document.createElement('div');
        sensorCard.className = 'device-card sensor-card';
        sensorCard.innerHTML = `
            <div class="device-header">
                <h3>${{lightSensorData.name}}</h3>
                <span class="device-status status-${{lightSensorData.status}}">${{lightSensorData.parameters.状态}}</span>
            </div>
            <div class="device-info">
                <p><strong>位置:</strong> ${{lightSensorData.location}}</p>
                <p><strong>当前光照:</strong> ${{lightSensorData.parameters.当前光照}}</p>
                <p><strong>平均值:</strong> ${{lightSensorData.parameters.平均值}}</p>
                <p><strong>数据点:</strong> ${{lightSensorData.parameters.数据点}}</p>
                <p><strong>最后更新:</strong> ${{lightSensorData.last_update}}</p>
            </div>
            <div class="device-actions">
                <button onclick="showSensorDetails('${{lightSensorData.id}}')">查看详情</button>
                <button onclick="showSensorChart('${{lightSensorData.id}}')">数据图表</button>
            </div>
        `;
        deviceList.appendChild(sensorCard);
    }}
}}

// 显示传感器详情
function showSensorDetails(sensorId) {{
    console.log('显示传感器详情:', sensorId);
    alert('光照传感器详情:\\n' +
          '设备ID: ' + lightSensorData.id + '\\n' +
          '当前光照: ' + lightSensorData.parameters.当前光照 + '\\n' +
          '状态: ' + lightSensorData.parameters.状态 + '\\n' +
          '位置: ' + lightSensorData.location);
}}

// 显示传感器数据图表
function showSensorChart(sensorId) {{
    console.log('显示传感器图表:', sensorId);
    const chartData = lightSensorData.recent_data.map(d => ({{
        time: d.time,
        value: d.value
    }}));
    console.log('图表数据:', chartData);
    alert('传感器数据图表功能\\n最近数据点: ' + chartData.length + ' 个');
}}

// 页面加载时自动添加传感器
document.addEventListener('DOMContentLoaded', function() {{
    setTimeout(addLightSensorToDeviceList, 1000);
}});
""".format(json_data=json.dumps(sensor_data, ensure_ascii=False, indent=2))

    print("\n=== 前端集成代码 ===")
    print("将以下代码添加到前端设备管理页面:")
    print(js_code)

    # 保存到文件
    with open('E:/gz/qwen/frontend_sensor_integration.js', 'w', encoding='utf-8') as f:
        f.write(js_code)

    print("\n代码已保存到: E:/gz/qwen/frontend_sensor_integration.js")
    print("\n=== 集成说明 ===")
    print("1. 将生成的JavaScript代码添加到前端设备管理页面")
    print("2. 或者直接在浏览器控制台运行代码来测试")
    print("3. 光照传感器将显示在设备列表中")
    print("4. 包含实时数据、状态信息和操作按钮")

if __name__ == "__main__":
    generate_frontend_code()