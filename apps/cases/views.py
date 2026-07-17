"""Case Management views."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Case, CaseNote
from .serializers import CaseSerializer, CaseNoteSerializer


class CaseViewSet(viewsets.ModelViewSet):
    """CRUD + notes for Cases."""
    serializer_class   = CaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # All cases — not filtered by user (admin sees everything)
        return Case.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # GET  /api/cases/{id}/notes/
    # POST /api/cases/{id}/notes/
    @action(detail=True, methods=['get', 'post'], url_path='notes')
    def notes(self, request, pk=None):
        case = self.get_object()

        if request.method == 'GET':
            notes = CaseNote.objects.filter(case=case)
            return Response(CaseNoteSerializer(notes, many=True).data)

        if request.method == 'POST':
            note_text = request.data.get('note', '').strip()
            if not note_text:
                return Response({'error': 'Note khali nahi ho sakta'}, status=status.HTTP_400_BAD_REQUEST)
            note = CaseNote.objects.create(case=case, author=request.user, note=note_text)
            return Response(CaseNoteSerializer(note).data, status=status.HTTP_201_CREATED)
