from email.message import EmailMessage

import aiosmtplib

from .config import settings


async def send_email(
        to_email: str, 
        subject: str,
        plain_text: str,
        html_content: str | None = None,
) -> None:
    message  = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = to_email
    message["Subject"] = subject

    message.set_content(plain_text)

    if html_content:
        message.add_alternative(html_content, subtype="html")

    await aiosmtplib.send(
        message, 
        hostname=settings.mail_server,
        port=settings.mail_port,
        username=settings.mail_username or None,
        password=settings.mail_password.get_secret_value() or None,
        start_tls=settings.mail_use_tls
    )


async def send_password_reset_email(to_email: str, username: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"

    plain_text = f"""Hi {username},

You requested to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Best regards,
The FastAPI Blog Team
"""

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; color: #333;">
        <p>Hi {username},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <p>
          <a href="{reset_url}"
             style="display:inline-block; padding:12px 24px; background:#7469ed;
                    color:#fff; text-decoration:none; border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:<br>
          <a href="{reset_url}">{reset_url}</a>
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>Best regards,<br>The FastAPI Blog Team</p>
      </body>
    </html>
    """

    await send_email(
        to_email=to_email,
        subject="Reset Your Password - FastAPI Blog",
        plain_text=plain_text,
        html_content=html_content,
    )