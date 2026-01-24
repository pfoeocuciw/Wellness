# backend/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import textwrap

load_dotenv()

app = FastAPI()

# Разрешаем запросы с фронта (локально)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ["GROQ_API_KEY"])


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


def ask_groq_structured(prompt: str) -> dict:
    resp = client.chat.completions.create(
        model="groq/compound",
        messages=[{"role": "user", "content": prompt}],
    )

    msg = resp.choices[0].message
    answer = (msg.content or "").strip()

    reasoning = getattr(msg, "reasoning", None)
    if reasoning:
        reasoning = textwrap.shorten(reasoning, width=350, placeholder=" ...")

    sources = extract_sources(getattr(msg, "executed_tools", None))

    return {
        "answer": answer,
        "reasoning": reasoning,
        "sources": sources,
    }


class ChatIn(BaseModel):
    message: str


@app.post("/chat")
def chat(body: ChatIn):
    result = ask_groq_structured(body.message)
    return result
