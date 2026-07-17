from .models import AuditLog

def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0]
    return request.META.get('REMOTE_ADDR')

def log_action(request, action, resource, resource_id='', description='', old_values=None, new_values=None):
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        resource=resource,
        resource_id=str(resource_id),
        description=description,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        old_values=old_values,
        new_values=new_values,
    )
