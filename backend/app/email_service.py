import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import settings


def send_verification_email(to_email: str, code: str):
    subject = "Код подтверждения Wellness"
    html = f"""
    <html>
      <body>
        <h2>Подтверждение почты</h2>
        <p>Ваш код подтверждения:</p>
        <div style="font-size:24px;font-weight:bold;letter-spacing:4px;">{code}</div>
        <p>Код действует 10 минут.</p>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())