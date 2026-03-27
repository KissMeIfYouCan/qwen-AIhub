from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Optional

import httpx


MODEL_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_CANDIDATES = [
    MODEL_ROOT / "Qwen3.5-0.8B.Q4_K_M.gguf",
    MODEL_ROOT / "Qwen3.5-4B.Q4_K_M.gguf",
    MODEL_ROOT / "Qwen3.5-9B.Q4_K_M.gguf",
]


def _parse_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _parse_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class AISettings:
    provider: str
    ollama_base_url: str
    ollama_model: str
    model_path: Optional[str]
    context_length: int
    max_tokens: int
    temperature: float
    threads: int
    chat_format: str
    enabled: bool


def _find_default_model() -> Optional[str]:
    for candidate in DEFAULT_MODEL_CANDIDATES:
        if candidate.exists():
            return str(candidate)
    return None


def _compact_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return re.sub(r"\s+", " ", text)


def _clip_list(items: list[Any], limit: int) -> list[Any]:
    return items[:limit] if len(items) > limit else items


@lru_cache(maxsize=1)
def get_ai_settings() -> AISettings:
    enabled_flag = os.getenv("AI_ENABLED", "true").strip().lower()
    return AISettings(
        provider=os.getenv("AI_PROVIDER", "ollama").strip().lower(),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
        ollama_model=os.getenv("OLLAMA_MODEL", "qwen3.5-9b:latest").strip(),
        model_path=os.getenv("AI_MODEL_PATH") or _find_default_model(),
        context_length=_parse_int("AI_CONTEXT_LENGTH", 4096),
        max_tokens=_parse_int("AI_MAX_TOKENS", 320),
        temperature=_parse_float("AI_TEMPERATURE", 0.1),
        threads=_parse_int("AI_THREADS", max(1, (os.cpu_count() or 2) // 2)),
        chat_format=os.getenv("AI_CHAT_FORMAT", "chatml"),
        enabled=enabled_flag not in {"0", "false", "off", "no"},
    )


class LocalAIService:
    def __init__(self, settings: AISettings):
        self.settings = settings
        self._llama = None
        self._lock = Lock()
        self._disabled_reason: Optional[str] = None

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.settings.enabled,
            "provider": self.settings.provider,
            "loaded": self._llama is not None,
            "model_path": self.settings.model_path,
            "chat_format": self.settings.chat_format,
            "max_tokens": self.settings.max_tokens,
            "context_length": self.settings.context_length,
            "ollama_base_url": self.settings.ollama_base_url,
            "ollama_model": self.settings.ollama_model,
            "disabled_reason": self._disabled_reason,
        }

    def engine_name(self) -> str:
        if self.settings.provider == "ollama":
            return f"ollama:{self.settings.ollama_model}"
        return "local-gguf"

    def is_available(self) -> bool:
        if not self.settings.enabled:
            self._disabled_reason = "AI_ENABLED is disabled"
            return False
        if self.settings.provider == "ollama":
            return self._check_ollama_available()
        if not self.settings.model_path:
            self._disabled_reason = "No GGUF model file found"
            return False
        return self._ensure_model_loaded()

    def answer_question(self, question: str, context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        normalized_context = self._normalize_context(context or {})
        direct_answer = self._try_direct_answer(question, normalized_context)
        if direct_answer:
            return direct_answer

        system_prompt = (
            "你是工业监控平台的运维助手。"
            "你只能依据提供的实时监控摘要回答，禁止编造设备、指标、告警或处理结果。"
            "如果信息不足，要明确说“当前数据不足”。"
            "回答用中文，控制在120字以内。"
            "先给结论，再给最多2条操作建议。"
        )
        user_prompt = (
            f"用户问题：{question}\n\n"
            f"实时监控摘要：\n{self._build_context_brief(normalized_context)}\n\n"
            "要求："
            "1. 只使用上面的数据。"
            "2. 不要输出 Markdown 标题。"
            "3. 不要扩展到未给出的设备和原因。"
        )
        answer = self._generate_text(system_prompt, user_prompt)
        if not answer:
            return None

        answer = self._post_process_answer(answer)
        provider_label = "Ollama" if self.settings.provider == "ollama" else "本地Qwen模型"
        return {
            "answer": answer,
            "confidence": 0.82,
            "sources": [provider_label, "当前页面实时数据"],
            "suggestions": self._build_follow_up_suggestions(question, normalized_context),
            "session_id": f"{self.settings.provider}_session",
        }

    def analyze_device(self, device: Dict[str, Any], diagnosis_type: str, alarms: list[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        related_alarms = [
            {
                "level": alarm.get("level"),
                "message": alarm.get("message"),
                "timestamp": alarm.get("timestamp"),
            }
            for alarm in alarms
            if alarm.get("device_id") == device.get("id") and alarm.get("status") == "active"
        ][:5]

        if not related_alarms and device.get("status") in {"unknown", None, ""}:
            return {
                "summary": "当前缺少足够的设备实时数据，无法做出可靠诊断。",
                "findings": ["设备状态未知，且没有关联的活跃告警。"],
                "recommendations": ["先补齐该设备的实时遥测和最近告警，再发起诊断。"],
                "confidence": 0.45,
            }

        system_prompt = (
            "你是工业设备诊断助手。"
            "请严格根据提供的设备信息和相关告警生成诊断。"
            "不要编造传感器型号、故障码、现场处理结果。"
            "返回 JSON，字段必须是 summary, findings, recommendations, confidence。"
            "findings 和 recommendations 必须是字符串数组。"
        )
        user_prompt = (
            f"诊断类型：{diagnosis_type}\n"
            f"设备信息：{json.dumps(device, ensure_ascii=False)}\n"
            f"相关告警：{json.dumps(related_alarms, ensure_ascii=False)}"
        )
        raw = self._generate_text(system_prompt, user_prompt, response_format="json")
        if not raw:
            return None
        parsed = self._parse_json_like(raw)
        if not parsed:
            return None

        findings = [str(item) for item in parsed.get("findings", []) if _compact_text(item)]
        recommendations = [str(item) for item in parsed.get("recommendations", []) if _compact_text(item)]
        return {
            "summary": str(parsed.get("summary") or "未生成诊断摘要"),
            "findings": findings or ["模型未返回有效 findings"],
            "recommendations": recommendations or ["建议人工复核设备状态"],
            "confidence": float(parsed.get("confidence") or 0.7),
        }

    def _normalize_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        system_status = context.get("systemStatus") or context.get("system_status") or {}
        devices = context.get("devices") or []
        alarms = context.get("alarms") or []

        normalized_devices = []
        for device in _clip_list(devices, 12):
            normalized_devices.append(
                {
                    "id": _compact_text(device.get("id")),
                    "name": _compact_text(device.get("name") or "未命名设备"),
                    "status": _compact_text(device.get("status") or "unknown"),
                    "location": _compact_text(device.get("location")),
                    "type": _compact_text(device.get("type")),
                }
            )

        normalized_alarms = []
        for alarm in _clip_list(alarms, 12):
            normalized_alarms.append(
                {
                    "device_name": _compact_text(alarm.get("device_name") or alarm.get("deviceId") or "未知设备"),
                    "level": _compact_text(alarm.get("level") or "unknown"),
                    "message": _compact_text(alarm.get("message") or "无描述"),
                    "status": _compact_text(alarm.get("status") or "unknown"),
                    "timestamp": _compact_text(alarm.get("timestamp")),
                }
            )

        return {
            "system_status": {
                "total_devices": int(system_status.get("totalDevices") or len(normalized_devices) or 0),
                "online_devices": int(system_status.get("onlineDevices") or len([d for d in normalized_devices if d["status"] == "online"]) or 0),
                "active_alarms": int(system_status.get("activeAlarms") or len([a for a in normalized_alarms if a["status"] == "active"]) or 0),
                "critical_alarms": int(system_status.get("criticalAlarms") or len([a for a in normalized_alarms if a["status"] == "active" and a["level"] == "critical"]) or 0),
            },
            "devices": normalized_devices,
            "alarms": normalized_alarms,
        }

    def _build_context_brief(self, context: Dict[str, Any]) -> str:
        system_status = context["system_status"]
        devices = context["devices"]
        alarms = context["alarms"]

        online_devices = [device["name"] for device in devices if device["status"] == "online"]
        fault_devices = [device["name"] for device in devices if device["status"] in {"fault", "error", "offline", "maintenance"}]
        active_alarms = [alarm for alarm in alarms if alarm["status"] == "active"]

        lines = [
            f"设备总数：{system_status['total_devices']}",
            f"在线设备：{system_status['online_devices']}",
            f"活跃告警：{system_status['active_alarms']}",
            f"严重告警：{system_status['critical_alarms']}",
            f"在线设备名单：{', '.join(online_devices[:6]) if online_devices else '暂无'}",
            f"异常设备名单：{', '.join(fault_devices[:6]) if fault_devices else '暂无'}",
        ]

        if active_alarms:
            alarm_summaries = [
                f"{alarm['device_name']}[{alarm['level']}] {alarm['message']}"
                for alarm in active_alarms[:6]
            ]
            lines.append(f"活跃告警摘要：{'；'.join(alarm_summaries)}")
        else:
            lines.append("活跃告警摘要：暂无")

        return "\n".join(lines)

    def _try_direct_answer(self, question: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        system_status = context["system_status"]
        devices = context["devices"]
        alarms = context["alarms"]
        lower_question = question.lower()

        online_devices = [device["name"] for device in devices if device["status"] == "online"]
        abnormal_devices = [device["name"] for device in devices if device["status"] in {"fault", "error", "offline", "maintenance"}]
        active_alarms = [alarm for alarm in alarms if alarm["status"] == "active"]
        critical_alarms = [alarm for alarm in active_alarms if alarm["level"] == "critical"]

        if any(keyword in question for keyword in ["在线", "设备状态", "设备", "运行状态"]) or "device" in lower_question:
            answer = (
                f"当前共有 {system_status['total_devices']} 台设备，在线 {system_status['online_devices']} 台。"
                f"在线设备：{('、'.join(online_devices[:6]) if online_devices else '暂无')}。"
                f"异常设备：{('、'.join(abnormal_devices[:6]) if abnormal_devices else '暂无')}。"
            )
            return {
                "answer": answer,
                "confidence": 0.95,
                "sources": ["当前页面设备数据", "当前页面系统状态"],
                "suggestions": ["最近有什么告警？", "列出异常设备"],
                "session_id": "direct_device_session",
            }

        if any(keyword in question for keyword in ["告警", "报警", "异常"]) or "alarm" in lower_question:
            latest_alarm = active_alarms[0] if active_alarms else None
            latest_summary = (
                f"最新活跃告警来自 {latest_alarm['device_name']}，等级 {latest_alarm['level']}，内容：{latest_alarm['message']}。"
                if latest_alarm else
                "当前没有活跃告警。"
            )
            answer = (
                f"当前活跃告警 {system_status['active_alarms']} 条，严重告警 {system_status['critical_alarms']} 条。"
                f"{latest_summary}"
            )
            return {
                "answer": answer,
                "confidence": 0.95,
                "sources": ["当前页面告警数据", "当前页面系统状态"],
                "suggestions": ["如何处理高等级告警？", "列出异常设备"],
                "session_id": "direct_alarm_session",
            }

        if any(keyword in question for keyword in ["总结", "概况", "总览", "风险"]) or "summary" in lower_question:
            risk_level = "高" if critical_alarms else ("中" if active_alarms else "低")
            answer = (
                f"系统当前风险等级为{risk_level}。"
                f"共有 {system_status['total_devices']} 台设备，在线 {system_status['online_devices']} 台，"
                f"活跃告警 {system_status['active_alarms']} 条，严重告警 {system_status['critical_alarms']} 条。"
            )
            return {
                "answer": answer,
                "confidence": 0.93,
                "sources": ["当前页面系统状态"],
                "suggestions": ["最近有什么告警？", "给我巡检建议"],
                "session_id": "direct_summary_session",
            }

        return None

    def _post_process_answer(self, answer: str) -> str:
        answer = answer.strip()
        answer = re.sub(r"<[^>]+>", "", answer)
        answer = re.sub(r"\n{3,}", "\n\n", answer)
        answer = re.sub(r"[*#`_]", "", answer)
        return answer[:320]

    def _check_ollama_available(self) -> bool:
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{self.settings.ollama_base_url}/api/tags")
                response.raise_for_status()
                payload = response.json()
            models = payload.get("models") or []
            matched = any(
                model.get("name") == self.settings.ollama_model or model.get("model") == self.settings.ollama_model
                for model in models
            )
            if not matched:
                self._disabled_reason = f"Ollama model not found: {self.settings.ollama_model}"
                return False
            self._disabled_reason = None
            return True
        except Exception as exc:
            self._disabled_reason = f"Ollama unavailable: {exc}"
            return False

    def _ensure_model_loaded(self) -> bool:
        if self._llama is not None:
            return True
        with self._lock:
            if self._llama is not None:
                return True
            try:
                from llama_cpp import Llama
            except Exception as exc:
                self._disabled_reason = f"llama-cpp-python unavailable: {exc}"
                return False
            try:
                self._llama = Llama(
                    model_path=self.settings.model_path,
                    n_ctx=self.settings.context_length,
                    n_threads=self.settings.threads,
                    chat_format=self.settings.chat_format,
                    verbose=False,
                )
                self._disabled_reason = None
                return True
            except Exception as exc:
                self._disabled_reason = f"Failed to load model: {exc}"
                self._llama = None
                return False

    def _generate_text(self, system_prompt: str, user_prompt: str, response_format: str = "text") -> Optional[str]:
        if self.settings.provider == "ollama":
            return self._generate_with_ollama(system_prompt, user_prompt, response_format)
        return self._generate_with_llama_cpp(system_prompt, user_prompt, response_format)

    def _generate_with_ollama(self, system_prompt: str, user_prompt: str, response_format: str) -> Optional[str]:
        payload: Dict[str, Any] = {
            "model": self.settings.ollama_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {
                "temperature": self.settings.temperature,
                "num_ctx": self.settings.context_length,
                "num_predict": self.settings.max_tokens,
            },
        }
        if response_format == "json":
            payload["format"] = "json"
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(f"{self.settings.ollama_base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
            message = data.get("message") or {}
            content = message.get("content")
            return content.strip() if isinstance(content, str) else None
        except Exception as exc:
            self._disabled_reason = f"Ollama generation failed: {exc}"
            return None

    def _generate_with_llama_cpp(self, system_prompt: str, user_prompt: str, response_format: str) -> Optional[str]:
        if not self._llama:
            return None
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        try:
            response = self._llama.create_chat_completion(
                messages=messages,
                max_tokens=self.settings.max_tokens,
                temperature=self.settings.temperature,
                response_format={"type": "json_object"} if response_format == "json" else None,
            )
            content = response["choices"][0]["message"]["content"]
            return content.strip() if isinstance(content, str) else None
        except TypeError:
            prompt = f"{system_prompt}\n\n{user_prompt}"
        except Exception:
            prompt = f"{system_prompt}\n\n{user_prompt}"
        try:
            response = self._llama.create_completion(
                prompt=prompt,
                max_tokens=self.settings.max_tokens,
                temperature=self.settings.temperature,
            )
            text = response["choices"][0]["text"]
            return text.strip() if isinstance(text, str) else None
        except Exception as exc:
            self._disabled_reason = f"Generation failed: {exc}"
            return None

    def _parse_json_like(self, raw: str) -> Optional[Dict[str, Any]]:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.S)
            if not match:
                self._disabled_reason = "Model did not return JSON"
                return None
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                self._disabled_reason = "Model returned malformed JSON"
                return None

    def _build_follow_up_suggestions(self, question: str, context: Dict[str, Any]) -> list[str]:
        alarms = context["alarms"]
        active_alarms = [alarm for alarm in alarms if alarm["status"] == "active"]
        if "告警" in question or "异常" in question:
            return ["列出严重告警", "给我处理建议"]
        if "设备" in question:
            return ["列出异常设备", "最近有什么告警？"]
        if active_alarms:
            return ["最近有什么告警？", "列出异常设备"]
        return ["当前有哪些设备在线？", "总结当前系统风险"]


@lru_cache(maxsize=1)
def get_local_ai_service() -> LocalAIService:
    return LocalAIService(get_ai_settings())
