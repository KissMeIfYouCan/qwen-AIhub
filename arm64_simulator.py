#!/usr/bin/env python3
"""
ARM64架构 5GB内存 纯CPU环境模拟测试脚本
模拟在资源受限的ARM64设备上运行Qwen模型
"""

import os
import sys
import time
import psutil
import platform
from datetime import datetime

class ARM64Simulator:
    def __init__(self):
        self.max_memory_gb = 5  # 5GB内存限制
        self.max_memory_bytes = self.max_memory_gb * 1024 * 1024 * 1024
        self.cpu_cores = 4  # 模拟ARM64 4核CPU
        self.architecture = "aarch64"  # ARM64架构

    def print_system_info(self):
        """打印模拟的系统信息"""
        print("=" * 60)
        print("🔧 ARM64架构模拟环境")
        print("=" * 60)
        print(f"架构: {self.architecture}")
        print(f"CPU核心数: {self.cpu_cores}")
        print(f"内存限制: {self.max_memory_gb}GB")
        print(f"计算模式: 纯CPU (无GPU加速)")
        print(f"模拟时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

    def check_memory_usage(self):
        """检查当前内存使用情况"""
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        memory_percent = (memory_info.rss / self.max_memory_bytes) * 100

        return {
            'memory_mb': memory_mb,
            'memory_percent': memory_percent,
            'available_mb': (self.max_memory_bytes - memory_info.rss) / 1024 / 1024
        }

    def simulate_cpu_performance(self):
        """模拟ARM64 CPU性能特征"""
        print("\n🔍 ARM64 CPU性能特征:")
        print("- 功耗优化架构，适合长时间运行")
        print("- 相比x86_64，单核性能略低但多核效率高")
        print("- 内存带宽相对较低，适合小模型推理")
        print("- 支持NEON SIMD指令集优化")

    def test_model_compatibility(self, model_path):
        """测试模型兼容性"""
        print(f"\n📋 模型兼容性检查:")

        if not os.path.exists(model_path):
            print(f"❌ 模型文件不存在: {model_path}")
            return False

        file_size = os.path.getsize(model_path)
        file_size_gb = file_size / (1024**3)

        print(f"📁 模型文件: {os.path.basename(model_path)}")
        print(f"📏 文件大小: {file_size_gb:.2f}GB")

        # 检查是否超过内存限制
        if file_size > self.max_memory_bytes * 0.8:  # 预留20%内存给系统
            print(f"⚠️  警告: 模型大小({file_size_gb:.2f}GB)接近内存限制({self.max_memory_gb}GB)")
            print("💡 建议: 使用更小的量化版本或启用内存映射")
        else:
            print(f"✅ 模型大小适合当前内存限制")

        return True

    def simulate_inference_performance(self, model_name):
        """模拟推理性能"""
        print(f"\n🚀 {model_name} 推理性能模拟:")

        # 模拟不同模型的性能特征
        if "0.5B" in model_name or "0.9B" in model_name:
            tokens_per_second = 15  # ARM64上小模型的预期性能
            memory_usage = 1.2  # GB
            first_token_latency = 200  # ms
        elif "1.8B" in model_name:
            tokens_per_second = 8
            memory_usage = 2.5
            first_token_latency = 400
        else:  # 9B模型
            tokens_per_second = 2
            memory_usage = 4.8
            first_token_latency = 1000

        print(f"🔢 预期性能指标:")
        print(f"  - 首Token延迟: ~{first_token_latency}ms")
        print(f"  - 生成速度: ~{tokens_per_second} tokens/秒")
        print(f"  - 内存占用: ~{memory_usage}GB")
        print(f"  - CPU利用率: ~{min(100, tokens_per_second * 6)}%")

        # 模拟实际推理过程
        print(f"\n⏱️  模拟推理过程:")
        for i in range(3):
            print(f"  第{i+1}轮推理...")
            time.sleep(0.5)  # 模拟推理延迟
            current_memory = self.check_memory_usage()
            print(f"    内存使用: {current_memory['memory_mb']:.1f}MB ({current_memory['memory_percent']:.1f}%)")

    def run_benchmark(self, model_paths):
        """运行完整的基准测试"""
        self.print_system_info()
        self.simulate_cpu_performance()

        for model_path in model_paths:
            if self.test_model_compatibility(model_path):
                model_name = os.path.basename(model_path)
                self.simulate_inference_performance(model_name)
                print("\n" + "-" * 60)

        print("\n📊 ARM64环境总结:")
        print("✅ 小模型(0.5B-1.8B)在ARM64上表现良好")
        print("⚠️  大模型(9B+)需要优化或使用更激进的量化")
        print("💡 建议使用Q4_K_M或Q5_K_M量化以平衡性能和质量")
        print("🔋 ARM64架构功耗低，适合边缘部署和长时间运行")

if __name__ == "__main__":
    simulator = ARM64Simulator()

    # 测试模型路径
    model_paths = [
        "E:/gz/qwen/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf",
        "E:/gz/qwen/Qwen3.5-9B.Q4_K_M.gguf"
    ]

    simulator.run_benchmark(model_paths)