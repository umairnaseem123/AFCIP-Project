"""2FA API Views."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .two_factor import generate_totp_secret, get_totp_uri, generate_qr_code, verify_totp, generate_backup_codes
import json

class TwoFactorSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get QR code for 2FA setup."""
        secret = generate_totp_secret()
        uri = get_totp_uri(request.user, secret)
        qr_b64 = generate_qr_code(uri)
        # Store secret temporarily in session
        request.session['pending_2fa_secret'] = secret
        return Response({
            'secret': secret,
            'qr_code': f"data:image/png;base64,{qr_b64}",
            'instructions': 'Scan QR code with Google Authenticator or Authy'
        })

    def post(self, request):
        """Verify and enable 2FA."""
        token = request.data.get('token')
        secret = request.session.get('pending_2fa_secret')
        if not secret:
            return Response({'error': 'No pending 2FA setup. Start over.'}, status=400)
        if verify_totp(secret, token):
            user = request.user
            profile, _ = getattr(user, 'two_factor_profile', None), None
            # Store on user profile if model supports it
            # For now save to session/return backup codes
            backup_codes = generate_backup_codes()
            del request.session['pending_2fa_secret']
            return Response({
                'success': True,
                'backup_codes': backup_codes,
                'message': '2FA enabled. Save your backup codes!'
            })
        return Response({'error': 'Invalid token. Try again.'}, status=400)


class TwoFactorVerifyView(APIView):
    def post(self, request):
        """Verify 2FA token during login."""
        token = request.data.get('token')
        secret = request.session.get('2fa_secret')
        if not secret:
            return Response({'error': 'No 2FA session found.'}, status=400)
        if verify_totp(secret, token):
            return Response({'success': True, 'message': '2FA verified'})
        return Response({'error': 'Invalid or expired token.'}, status=400)
