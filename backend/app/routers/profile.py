from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..models import User, Category, UserInterestingCategory
from ..schemas import UserProfileOut, UpdateProfileRequest, UpdateInterestsRequest

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=UserProfileOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(
            joinedload(User.interesting_categories).joinedload(UserInterestingCategory.category)
        )
        .filter(User.id == current_user.id)
        .first()
    )

    interests = [item.category for item in user.interesting_categories]

    return UserProfileOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_verified=user.is_verified,
        is_email_verified=user.is_email_verified,
        diploma_info=user.diploma_info,
        bio=user.bio,
        created_at=user.created_at,
        interests=interests,
    )


@router.patch("/me", response_model=UserProfileOut)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()

    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()

    if payload.bio is not None:
        user.bio = payload.bio

    if payload.diploma_info is not None:
        if user.role != "expert":
            raise HTTPException(status_code=400, detail="Только эксперт может менять diploma_info")
        user.diploma_info = payload.diploma_info

    db.commit()
    db.refresh(user)

    interests = [item.category for item in user.interesting_categories]

    return UserProfileOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_verified=user.is_verified,
        is_email_verified=user.is_email_verified,
        diploma_info=user.diploma_info,
        bio=user.bio,
        created_at=user.created_at,
        interests=interests,
    )


@router.put("/interests")
def update_interests(
    payload: UpdateInterestsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = db.query(Category).filter(Category.id.in_(payload.category_ids)).all()
    found_ids = {c.id for c in categories}

    missing_ids = [cid for cid in payload.category_ids if cid not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=400, detail=f"Категории не найдены: {missing_ids}")

    db.query(UserInterestingCategory).filter(
        UserInterestingCategory.user_id == current_user.id
    ).delete()

    for category_id in payload.category_ids:
        db.add(UserInterestingCategory(user_id=current_user.id, category_id=category_id))

    db.commit()

    return {"message": "Интересы обновлены"}