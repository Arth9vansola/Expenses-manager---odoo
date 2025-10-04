from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.db import transaction
from .models import User, Company
from .serializers import UserSerializer, CompanySerializer
import json


# Country to currency mapping
COUNTRY_CURRENCY_MAP = {
    'United States': 'USD',
    'United Kingdom': 'GBP', 
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Belgium': 'EUR',
    'Austria': 'EUR',
    'Portugal': 'EUR',
    'Ireland': 'EUR',
    'Finland': 'EUR',
    'Greece': 'EUR',
    'Japan': 'JPY',
    'China': 'CNY',
    'India': 'INR',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'South Korea': 'KRW',
    'Singapore': 'SGD',
    'Hong Kong': 'HKD',
    'Switzerland': 'CHF',
    'Norway': 'NOK',
    'Sweden': 'SEK',
    'Denmark': 'DKK',
    'Poland': 'PLN',
    'Czech Republic': 'CZK',
    'Hungary': 'HUF',
    'Russia': 'RUB',
    'Turkey': 'TRY',
    'South Africa': 'ZAR',
    'Israel': 'ILS',
    'Thailand': 'THB',
    'Malaysia': 'MYR',
    'Indonesia': 'IDR',
    'Philippines': 'PHP',
    'Vietnam': 'VND',
    'New Zealand': 'NZD',
}


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    company_name = serializers.CharField(max_length=255)
    country = serializers.CharField(max_length=100)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_country(self, value):
        if value not in COUNTRY_CURRENCY_MAP:
            raise serializers.ValidationError(
                f"Unsupported country. Supported countries: {', '.join(COUNTRY_CURRENCY_MAP.keys())}"
            )
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CreateUserSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['manager', 'employee'])
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_manager_id(self, value):
        if value and not User.objects.filter(id=value, role='manager').exists():
            raise serializers.ValidationError("Manager not found or user is not a manager.")
        return value


class UpdateUserSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['admin', 'manager', 'employee'], required=False)
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    reset_password = serializers.BooleanField(required=False, default=False)
    
    def validate_manager_id(self, value):
        if value and not User.objects.filter(id=value, role='manager').exists():
            raise serializers.ValidationError("Manager not found or user is not a manager.")
        return value


class SignupView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                # Get currency from country
                currency = COUNTRY_CURRENCY_MAP[serializer.validated_data['country']]
                
                # Create company
                company = Company.objects.create(
                    name=serializer.validated_data['company_name'],
                    country=serializer.validated_data['country'],
                    currency=currency,
                    settings={
                        'expense_categories': ['Travel', 'Meals', 'Office Supplies', 'Transportation', 'Other'],
                        'approval_required': True,
                        'default_expense_limit': 1000
                    }
                )
                
                # Create admin user
                user = User.objects.create(
                    email=serializer.validated_data['email'],
                    name=serializer.validated_data['name'],
                    role='admin',
                    company=company,
                    password=make_password(serializer.validated_data['password']),
                    is_active=True
                )
                
                # Create token for authentication
                token, created = Token.objects.get_or_create(user=user)
                
                return Response({
                    'message': 'Company and admin user created successfully',
                    'token': token.key,
                    'user': UserSerializer(user).data,
                    'company': CompanySerializer(company).data
                }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            try:
                user = User.objects.get(email=email)
                if user.check_password(password):
                    if not user.is_active:
                        return Response({
                            'error': 'Account is disabled'
                        }, status=status.HTTP_401_UNAUTHORIZED)
                    
                    # Create or get token
                    token, created = Token.objects.get_or_create(user=user)
                    
                    return Response({
                        'message': 'Login successful',
                        'token': token.key,
                        'user': UserSerializer(user).data
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'error': 'Invalid credentials'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            except User.DoesNotExist:
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserManagementView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Only admins can view all users
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get users from the same company
        users = User.objects.filter(company=request.user.company).order_by('created_at')
        serializer = UserSerializer(users, many=True)
        
        return Response({
            'users': serializer.data,
            'total_count': users.count()
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        # Only admins can create users
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CreateUserSerializer(data=request.data)
        if serializer.is_valid():
            # Generate a temporary password
            temp_password = f"temp{serializer.validated_data['name'][:4]}123"
            
            # Create user
            user = User.objects.create(
                email=serializer.validated_data['email'],
                name=serializer.validated_data['name'],
                role=serializer.validated_data['role'],
                company=request.user.company,
                password=make_password(temp_password),
                is_active=True
            )
            
            # Set manager if provided
            if serializer.validated_data.get('manager_id'):
                manager = User.objects.get(id=serializer.validated_data['manager_id'])
                user.manager = manager
                user.save()
            
            return Response({
                'message': f'User created successfully. Temporary password: {temp_password}',
                'user': UserSerializer(user).data,
                'temporary_password': temp_password
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, user_id):
        # Only admins can update users
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id, company=request.user.company)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UpdateUserSerializer(data=request.data)
        if serializer.is_valid():
            updated_fields = []
            
            # Update role
            if 'role' in serializer.validated_data:
                user.role = serializer.validated_data['role']
                updated_fields.append('role')
            
            # Update manager
            if 'manager_id' in serializer.validated_data:
                if serializer.validated_data['manager_id']:
                    manager = User.objects.get(id=serializer.validated_data['manager_id'])
                    user.manager = manager
                else:
                    user.manager = None
                updated_fields.append('manager')
            
            # Reset password
            if serializer.validated_data.get('reset_password'):
                new_password = f"reset{user.name[:4]}123"
                user.password = make_password(new_password)
                updated_fields.append('password')
                
                user.save()
                
                return Response({
                    'message': f'User updated successfully. Updated fields: {", ".join(updated_fields)}',
                    'user': UserSerializer(user).data,
                    'new_password': new_password if 'password' in updated_fields else None
                }, status=status.HTTP_200_OK)
            
            user.save()
            
            return Response({
                'message': f'User updated successfully. Updated fields: {", ".join(updated_fields)}',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Logout view
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Delete the user's token
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({
                'message': 'Successfully logged out'
            }, status=status.HTTP_200_OK)
        except Token.DoesNotExist:
            return Response({
                'message': 'Already logged out'
            }, status=status.HTTP_200_OK)