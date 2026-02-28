from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

# Create your views here.
class LoginView(APIView):
    def get(self, request: Request):
        return Response({"message": "Hello from class"})