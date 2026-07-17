"""Network graph for transaction relationship mapping."""
from django.db.models import Count
from collections import defaultdict

def build_transaction_network(user_id=None, limit=100):
    """
    Build a network graph of users and their transactions.
    Returns nodes and edges for frontend visualization.
    """
    from .models import Transaction
    
    qs = Transaction.objects.all().order_by('-created_at')[:limit]
    if user_id:
        qs = Transaction.objects.filter(user_id=user_id)[:limit]

    nodes = {}
    edges = []

    for txn in qs:
        uid = txn.user_id
        if uid not in nodes:
            nodes[uid] = {
                'id': f'user_{uid}',
                'label': f'User {uid}',
                'type': 'user',
                'transaction_count': 0,
                'total_amount': 0,
                'is_flagged': False,
            }
        nodes[uid]['transaction_count'] += 1
        nodes[uid]['total_amount'] += float(txn.amount)
        if txn.is_fraud:
            nodes[uid]['is_flagged'] = True

        edges.append({
            'id': f'txn_{txn.id}',
            'source': f'user_{uid}',
            'target': f'txn_{txn.id}',
            'label': f'PKR {txn.amount}',
            'is_fraud': txn.is_fraud,
            'amount': float(txn.amount),
            'timestamp': txn.created_at.isoformat(),
        })

    return {
        'nodes': list(nodes.values()),
        'edges': edges,
        'total_nodes': len(nodes),
        'total_edges': len(edges),
    }
