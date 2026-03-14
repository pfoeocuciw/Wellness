import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User, EmailVerificationCode
from ..schemas import RegisterRequest, VerifyEmailRequest, LoginRequest, TokenResponse
from ..auth import hash_password, verify_password, create_access_token
from ..email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["Auth"])


def generate_code() -> str:
    return str(random.randint(100000, 999999))


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Пользователь с такой почтой уже существует")

    if payload.role == "expert":
        if not payload.diploma_info:
            raise HTTPException(status_code=400, detail="Для эксперта нужно указать diploma_info")

    user = User(
        email=email,
        password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        role=payload.role,
        diploma_info=payload.diploma_info,
        bio=payload.bio,
        is_verified=False,
        is_email_verified=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    code = generate_code()

    verification = EmailVerificationCode(
        user_id=user.id,
        email=user.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        used=False,
    )

    db.add(verification)
    db.commit()

    send_verification_email(user.email, code)

    return {
        "message": "Пользователь создан. Код подтверждения отправлен на почту.",
        "user_id": user.id,
        "email": user.email,
    }


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == email, User.deleted_flag == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == payload.code,
            EmailVerificationCode.used == False,
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(status_code=400, detail="Неверный код")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Код истёк")

    record.used = True
    user.is_email_verified = True
    user.email_verified_at = datetime.utcnow()

    db.commit()

    return {"message": "Почта успешно подтверждена"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == email, User.deleted_flag == False).first()
    if not user:
        raise HTTPException(status_code=401, detail="Неверная почта или пароль")

    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Неверная почта или пароль")

    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Сначала подтвердите почту")

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    return TokenResponse(access_token=token)