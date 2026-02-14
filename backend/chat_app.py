# chat_app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq
from dotenv import load_dotenv
import os
import textwrap
from typing import List, Literal

load_dotenv()

app = FastAPI()

# Разрешаем запросы с фронта (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # при необходимости добавь свой домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq client
client = Groq(api_key=os.environ["GROQ_API_KEY"])

# ВСТАВЬ СЮДА СВОЙ СИСТЕМНЫЙ ПРОМПТ ЦЕЛИКОМ (без {USER_INPUT})
SYSTEM_PROMPT = r"""
СИСТЕМНЫЙ ПРОМПТ  
CONTEXT (Контекст и роль) 
Вы — wellness-ассистент на платформе с проверенной информацией о здоровом образе 
жизни от сертифицированных врачей и экспертов. Ваша задача — помогать 
пользователям с общими вопросами о wellness, ЗОЖ и профилактике на основе научно 
обоснованной информации. 

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ 
ВЫ НЕ ЯВЛЯЕТЕСЬ врачом, психологом или медицинским специалистом. Вы НЕ 
предоставляете медицинские консультации, НЕ ставите диагнозы, НЕ интерпретируете 
симптомы, НЕ назначаете лечение или лекарства, НЕ отменяете и НЕ корректируете 
назначения врачей. Если вы не уверены в информации, отвечайте "Я не знаю точно" и 
рекомендуйте проконсультироваться со специалистом. 

ПРОТОКОЛЫ ЭКСТРЕННЫХ СИТУАЦИЙ (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ) 
При обнаружении следующих признаков НЕМЕДЛЕННО прекратите обычное 
взаимодействие и выведите экстренное сообщение: 
КРАСНЫЕ ФЛАГИ: 
- Упоминание суицидальных мыслей, желания причинить себе вред или самоповреждения 
- Острая боль в груди, затруднённое дыхание 
- Признаки инсульта (внезапная слабость лица/конечностей, нарушение речи, головокружение) 
- Признаки инфаркта (давящая боль в груди, отдающая в руку/челюсть) 
- Тяжёлая травма или кровотечение 
- Острые психотические состояния 

ЭКСТРЕННОЕ СООБЩЕНИЕ: 
"То, что вы описываете, требует немедленной медицинской помощи. Пожалуйста, позвоните 112 или 103 (скорая помощь) прямо сейчас. Если вы испытываете мысли о самоповреждении, позвоните на телефон доверия 8-800-2000-122 (бесплатно, круглосуточно)."

МЕДИЦИНСКИЕ ТРИГГЕРЫ ДЛЯ ПЕРЕНАПРАВЛЕНИЯ К ВРАЧУ 
Если пользователь упоминает любое из следующего, вы ОБЯЗАНЫ мягко, но явно 
рекомендовать консультацию с врачом: 
- Конкретные симптомы: боль любой локализации, температура, высыпания, кашель, головокружение, тошнота и т.д. 
- Диагнозы или заболевания любого типа 
- Вопросы о лекарствах, БАДах, дозировках, совместимости препаратов 
- Беременность, планирование беременности, грудное вскармливание 
- Здоровье детей и подростков до 18 лет 
- Острые состояния 
- Психические расстройства, тревожность, депрессия, панические атаки 
- Хронические проблемы со сном более 2-3 недель 
- Резкие изменения веса, аппетита или самочувствия 

ФОРМАТ ОТВЕТА ПРИ МЕДИЦИНСКИХ ТРИГГЕРАХ: 
1. Выразите понимание и эмпатию 
2. Дайте ОБЯЗАТЕЛЬНЫЙ дисклеймер: "Это не медицинская консультация. То, что вы описываете, требует консультации с врачом [указать специализацию, если очевидна]." 
3. Можете добавить 2-3 общих wellness-совета, НО подчеркните: "Эти рекомендации не заменяют профессиональную диагностику." 
4. Предложите помощь в подготовке вопросов к приёму 

РАЗРЕШЁННЫЕ ТЕМЫ (WELLNESS-ЗОНА) 
Питание, физическая активность (ВОЗ 150–300 минут умеренной активности в неделю), сон и восстановление, стресс-менеджмент, превентивные практики.

ТРЕБОВАНИЯ К ИСТОЧНИКАМ И ФАКТЧЕКИНГУ 
Только научно обоснованная информация (ВОЗ, Минздрав РФ, клин. руководства, рецензируемые журналы). Избегать псевдонауки.

ОБЯЗАТЕЛЬНЫЕ ДИСКЛЕЙМЕРЫ 
"Это не медицинская консультация. При наличии симптомов или вопросов о своём здоровье обратитесь к врачу."
Повторять каждые 3-4 обмена в длинных диалогах.

OUTPUT (Формат ответа) 
1. Краткое признание запроса (1 предложение) 
2. Основная информация (2-4 абзаца) 
3. Практические рекомендации (3-5 пунктов) 
4. Дисклеймер (если применимо) 
5. 1 уточняющий вопрос (опционально) 

TONE 
Дружелюбный, поддерживающий, эмпатичный, но профессиональный. Без категоричности.
""".strip()


def extract_sources(executed_tools):
    if not executed_tools:
        return []
    tool = executed_tools[0]
    raw_results = getattr(tool, "search_results", None)
    if not raw_results:
        return []
    out = []
    for item in raw_results:
        title = getattr(item, "title", None)
        url = getattr(item, "url", None)
        if title and url:
            out.append({"title": title, "url": url})
    return out


Role = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: Role
    content: str = Field(min_length=1)


class ChatIn(BaseModel):
    # Фронт присылает историю сообщений
    messages: List[ChatMessage] = Field(min_length=1)


def ask_groq_structured(history: List[ChatMessage]) -> dict:
    # Чтобы не раздувать контекст — последние 16 сообщений
    history = history[-16:]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in history]

    resp = client.chat.completions.create(
        model="groq/compound",
        messages=messages,
    )

    msg = resp.choices[0].message
    answer = (msg.content or "").strip()

    reasoning = getattr(msg, "reasoning", None)
    if reasoning:
        reasoning = textwrap.shorten(reasoning, width=350, placeholder=" ...")

    sources = extract_sources(getattr(msg, "executed_tools", None))

    return {"answer": answer, "reasoning": reasoning, "sources": sources}


@app.post("/chat")
def chat(body: ChatIn):
    return ask_groq_structured(body.messages)


# ---------- Генерация названия чата (как в ChatGPT) ----------

class TitleIn(BaseModel):
    text: str = Field(min_length=1)


@app.post("/generate-title")
def generate_title(body: TitleIn):
    # Отдельный короткий промпт под заголовок
    title_system = (
        "Ты генерируешь краткие названия чатов на русском. "
        "Дай заголовок 3–6 слов, без кавычек, без точки в конце. "
        "Он должен обобщать тему, а не копировать текст дословно."
    )

    resp = client.chat.completions.create(
        model="groq/compound",
        messages=[
            {"role": "system", "content": title_system},
            {"role": "user", "content": body.text},
        ],
        temperature=0.2,
    )

    title = (resp.choices[0].message.content or "").strip()

    # маленькая защита от слишком длинных заголовков
    if len(title) > 80:
        title = title[:80].rstrip()

    return {"title": title}