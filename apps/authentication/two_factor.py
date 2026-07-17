"""Two-Factor Authentication utilities."""
import pyotp
import qrcode
import base64
from io import BytesIO
from django.conf import settings

TOTP_ISSUER = "AFCIP Banking"

def generate_totp_secret():
    """Generate a new TOTP secret for a user."""
    return pyotp.random_base32()

def get_totp_uri(user, secret):
    """Get the otpauth URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=user.email or user.username,
        issuer_name=TOTP_ISSUER
    )

def generate_qr_code(uri):
    """Generate a QR code as base64 image string."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def verify_totp(secret, token):
    """Verify a TOTP token. Returns True if valid."""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)

def generate_backup_codes(count=8):
    """Generate one-time backup codes."""
    import secrets
    codes = [secrets.token_hex(4).upper() for _ in range(count)]
    return codes
