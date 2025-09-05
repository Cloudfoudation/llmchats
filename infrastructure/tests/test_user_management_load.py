"""
User Management API Load and Stress Tests
Tests performance under various load conditions
"""
import pytest
import asyncio
import aiohttp
import time
import statistics
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Tuple, Dict
from test_config import config
from auth_helper import auth
from api_client import client

class TestUserManagementLoad:
    """Load and stress tests for User Management API"""
    
    @pytest.fixture(scope="class")
    def test_environment(self):
        """Setup test environment once per class"""
        from run_tests import setup_test_environment
        if not setup_test_environment():
            pytest.skip("Failed to setup test environment")
        yield
    
    @pytest.fixture(scope="class")
    def user_emails(self, test_environment):
        """Provide user emails for different tiers"""
        return {
            'admin': config.test_users['admin']['email'],
            'paid': config.test_users['paid']['email'],
            'free': config.test_users['free']['email']
        }
    
    @pytest.fixture
    def load_test_users(self):
        """Track users created during load tests for cleanup"""
        users_to_cleanup = []
        yield users_to_cleanup
        
        # Cleanup all created users
        admin_email = config.test_users['admin']['email']
        for username in users_to_cleanup:
            try:
                client.delete_user(admin_email, username)
            except Exception:
                pass  # User might already be deleted

    # ========================================
    # RESPONSE TIME TESTS
    # ========================================
    
    @pytest.mark.performance
    def test_list_users_response_time(self, user_emails):
        """Test list users response time under normal conditions"""
        response_times = []
        
        # Measure response time over multiple requests
        for _ in range(10):
            start_time = time.time()
            status_code, response = client.list_users(user_emails['admin'])
            response_time = time.time() - start_time
            
            assert status_code == 200
            response_times.append(response_time)
        
        # Calculate statistics
        avg_time = statistics.mean(response_times)
        max_time = max(response_times)
        min_time = min(response_times)
        
        # Performance assertions
        assert avg_time < 2.0, f"Average response time {avg_time:.3f}s exceeds 2s"
        assert max_time < 5.0, f"Maximum response time {max_time:.3f}s exceeds 5s"
        assert min_time < 3.0, f"Minimum response time {min_time:.3f}s exceeds 3s"
        
        print(f"List users - Avg: {avg_time:.3f}s, Min: {min_time:.3f}s, Max: {max_time:.3f}s")
    
    @pytest.mark.performance
    def test_get_user_response_time(self, user_emails, load_test_users):
        """Test get user response time"""
        # Create a test user first
        user_data = {
            "username": f"perf_test_{uuid.uuid4().hex[:8]}@example.com",
            "email": f"perf_test_{uuid.uuid4().hex[:8]}@example.com",
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        assert status_code == 201
        username = response['data']['username']
        load_test_users.append(username)
        
        # Measure get user response times
        response_times = []
        for _ in range(10):
            start_time = time.time()
            status_code, response = client.get_user(user_emails['admin'], username)
            response_time = time.time() - start_time
            
            assert status_code == 200
            response_times.append(response_time)
        
        avg_time = statistics.mean(response_times)
        assert avg_time < 1.5, f"Average get user time {avg_time:.3f}s exceeds 1.5s"
        
        print(f"Get user - Avg: {avg_time:.3f}s")
    
    @pytest.mark.performance
    def test_create_user_response_time(self, user_emails, load_test_users):
        """Test create user response time"""
        response_times = []
        
        # Create multiple users and measure time
        for i in range(5):
            user_data = {
                "username": f"create_perf_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"create_perf_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "TempPass123!"
            }
            
            start_time = time.time()
            status_code, response = client.create_user(user_emails['admin'], user_data)
            response_time = time.time() - start_time
            
            assert status_code == 201
            response_times.append(response_time)
            load_test_users.append(response['data']['username'])
        
        avg_time = statistics.mean(response_times)
        assert avg_time < 3.0, f"Average create user time {avg_time:.3f}s exceeds 3s"
        
        print(f"Create user - Avg: {avg_time:.3f}s")

    # ========================================
    # CONCURRENT ACCESS TESTS
    # ========================================
    
    @pytest.mark.performance
    def test_concurrent_list_users(self, user_emails):
        """Test concurrent list users requests"""
        def list_users_worker():
            start_time = time.time()
            status_code, response = client.list_users(user_emails['admin'])
            response_time = time.time() - start_time
            return status_code, response_time
        
        # Run 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(list_users_worker) for _ in range(10)]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze results
        successful_requests = [r for r in results if r[0] == 200]
        response_times = [r[1] for r in successful_requests]
        
        # At least 80% should succeed
        success_rate = len(successful_requests) / len(results)
        assert success_rate >= 0.8, f"Success rate {success_rate:.2f} below 80%"
        
        # Average response time should be reasonable
        if response_times:
            avg_time = statistics.mean(response_times)
            assert avg_time < 5.0, f"Average concurrent response time {avg_time:.3f}s exceeds 5s"
            
            print(f"Concurrent list users - Success rate: {success_rate:.2f}, Avg time: {avg_time:.3f}s")
    
    @pytest.mark.performance
    def test_concurrent_user_creation(self, user_emails, load_test_users):
        """Test concurrent user creation"""
        def create_user_worker(index):
            user_data = {
                "username": f"concurrent_{index}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"concurrent_{index}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "TempPass123!"
            }
            
            start_time = time.time()
            status_code, response = client.create_user(user_emails['admin'], user_data)
            response_time = time.time() - start_time
            
            return status_code, response, response_time
        
        # Create 5 users concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_user_worker, i) for i in range(5)]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze results
        successful_creates = [r for r in results if r[0] == 201]
        response_times = [r[2] for r in successful_creates]
        
        # Track created users for cleanup
        for status_code, response, _ in successful_creates:
            load_test_users.append(response['data']['username'])
        
        # Most should succeed
        success_rate = len(successful_creates) / len(results)
        assert success_rate >= 0.8, f"Concurrent create success rate {success_rate:.2f} below 80%"
        
        if response_times:
            avg_time = statistics.mean(response_times)
            print(f"Concurrent user creation - Success rate: {success_rate:.2f}, Avg time: {avg_time:.3f}s")
    
    @pytest.mark.performance
    def test_mixed_concurrent_operations(self, user_emails, load_test_users):
        """Test mixed concurrent operations (read/write)"""
        # Create a test user first
        user_data = {
            "username": f"mixed_test_{uuid.uuid4().hex[:8]}@example.com",
            "email": f"mixed_test_{uuid.uuid4().hex[:8]}@example.com",
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        assert status_code == 201
        test_username = response['data']['username']
        load_test_users.append(test_username)
        
        def operation_worker(operation_type, index):
            start_time = time.time()
            
            if operation_type == 'list':
                status_code, response = client.list_users(user_emails['admin'])
            elif operation_type == 'get':
                status_code, response = client.get_user(user_emails['admin'], test_username)
            elif operation_type == 'update_groups':
                status_code, response = client.update_user_groups(
                    user_emails['admin'], 
                    test_username, 
                    {"addToGroups": ["free"]}
                )
            elif operation_type == 'create':
                new_user_data = {
                    "username": f"mixed_{index}_{uuid.uuid4().hex[:8]}@example.com",
                    "email": f"mixed_{index}_{uuid.uuid4().hex[:8]}@example.com",
                    "temporaryPassword": "TempPass123!"
                }
                status_code, response = client.create_user(user_emails['admin'], new_user_data)
                if status_code == 201:
                    load_test_users.append(response['data']['username'])
            
            response_time = time.time() - start_time
            return operation_type, status_code, response_time
        
        # Mix of operations
        operations = [
            ('list', 0), ('list', 1), ('list', 2),
            ('get', 0), ('get', 1),
            ('update_groups', 0),
            ('create', 0), ('create', 1)
        ]
        
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(operation_worker, op_type, index) for op_type, index in operations]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze results by operation type
        operation_stats = {}
        for op_type, status_code, response_time in results:
            if op_type not in operation_stats:
                operation_stats[op_type] = {'success': 0, 'total': 0, 'times': []}
            
            operation_stats[op_type]['total'] += 1
            if status_code < 400:
                operation_stats[op_type]['success'] += 1
                operation_stats[op_type]['times'].append(response_time)
        
        # Verify performance
        for op_type, stats in operation_stats.items():
            success_rate = stats['success'] / stats['total']
            assert success_rate >= 0.7, f"{op_type} success rate {success_rate:.2f} below 70%"
            
            if stats['times']:
                avg_time = statistics.mean(stats['times'])
                print(f"{op_type} - Success rate: {success_rate:.2f}, Avg time: {avg_time:.3f}s")

    # ========================================
    # STRESS TESTS
    # ========================================
    
    @pytest.mark.performance
    @pytest.mark.slow
    def test_sustained_load(self, user_emails):
        """Test sustained load over time"""
        duration = 30  # 30 seconds
        start_time = time.time()
        request_count = 0
        error_count = 0
        response_times = []
        
        while time.time() - start_time < duration:
            request_start = time.time()
            status_code, response = client.list_users(user_emails['admin'])
            request_time = time.time() - request_start
            
            request_count += 1
            if status_code != 200:
                error_count += 1
            else:
                response_times.append(request_time)
            
            # Small delay to avoid overwhelming
            time.sleep(0.1)
        
        # Calculate metrics
        total_time = time.time() - start_time
        requests_per_second = request_count / total_time
        error_rate = error_count / request_count if request_count > 0 else 0
        avg_response_time = statistics.mean(response_times) if response_times else 0
        
        # Performance assertions
        assert requests_per_second >= 5, f"RPS {requests_per_second:.2f} below minimum 5"
        assert error_rate <= 0.1, f"Error rate {error_rate:.2f} above 10%"
        assert avg_response_time < 3.0, f"Average response time {avg_response_time:.3f}s exceeds 3s"
        
        print(f"Sustained load - RPS: {requests_per_second:.2f}, Error rate: {error_rate:.2f}, Avg time: {avg_response_time:.3f}s")
    
    @pytest.mark.performance
    @pytest.mark.slow
    def test_burst_load(self, user_emails):
        """Test handling of burst load"""
        def burst_worker():
            start_time = time.time()
            status_code, response = client.list_users(user_emails['admin'])
            response_time = time.time() - start_time
            return status_code, response_time
        
        # Send 20 requests as quickly as possible
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(burst_worker) for _ in range(20)]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze burst results
        successful_requests = [r for r in results if r[0] == 200]
        rate_limited = [r for r in results if r[0] == 429]
        server_errors = [r for r in results if r[0] >= 500]
        
        success_rate = len(successful_requests) / len(results)
        rate_limit_rate = len(rate_limited) / len(results)
        error_rate = len(server_errors) / len(results)
        
        # Should handle burst gracefully
        assert error_rate <= 0.1, f"Server error rate {error_rate:.2f} above 10% during burst"
        assert success_rate + rate_limit_rate >= 0.9, "Should either succeed or rate limit, not error"
        
        if successful_requests:
            response_times = [r[1] for r in successful_requests]
            avg_time = statistics.mean(response_times)
            print(f"Burst load - Success: {success_rate:.2f}, Rate limited: {rate_limit_rate:.2f}, Avg time: {avg_time:.3f}s")

    # ========================================
    # MEMORY AND RESOURCE TESTS
    # ========================================
    
    @pytest.mark.performance
    def test_large_user_list_handling(self, user_emails):
        """Test handling of large user lists"""
        # Request maximum number of users
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            user_emails['admin'],
            params={'limit': '60'}  # Maximum allowed by Cognito
        )
        
        assert status_code == 200
        users = response['data']['users']
        
        # Verify response structure is maintained even with large lists
        if users:
            # Check first and last user have all required fields
            required_fields = ['username', 'email', 'status', 'enabled', 'createdAt', 'groups']
            
            for field in required_fields:
                assert field in users[0], f"Missing field {field} in first user"
                assert field in users[-1], f"Missing field {field} in last user"
        
        print(f"Large list test - Retrieved {len(users)} users")
    
    @pytest.mark.performance
    def test_pagination_performance(self, user_emails):
        """Test pagination performance"""
        page_sizes = [5, 10, 20, 50]
        
        for page_size in page_sizes:
            start_time = time.time()
            status_code, response = client.make_request(
                'GET',
                f"{config.get_api_url('user_management')}/users",
                user_emails['admin'],
                params={'limit': str(page_size)}
            )
            response_time = time.time() - start_time
            
            assert status_code == 200
            assert len(response['data']['users']) <= page_size
            assert response_time < 3.0, f"Page size {page_size} took {response_time:.3f}s"
            
            print(f"Page size {page_size} - Time: {response_time:.3f}s, Users: {len(response['data']['users'])}")

    # ========================================
    # ASYNC LOAD TESTS
    # ========================================
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_async_concurrent_requests(self, user_emails):
        """Test async concurrent requests for maximum throughput"""
        async def make_async_request(session, url, headers):
            start_time = time.time()
            try:
                async with session.get(url, headers=headers) as response:
                    await response.text()
                    response_time = time.time() - start_time
                    return response.status, response_time
            except Exception as e:
                response_time = time.time() - start_time
                return 500, response_time
        
        # Setup async session
        auth_headers = auth.get_auth_headers(user_emails['admin'])
        url = f"{config.get_api_url('user_management')}/users"
        
        connector = aiohttp.TCPConnector(limit=50)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Create 30 concurrent requests
            tasks = [make_async_request(session, url, auth_headers) for _ in range(30)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_results = [r for r in results if isinstance(r, tuple)]
        
        if valid_results:
            successful_requests = [r for r in valid_results if r[0] == 200]
            response_times = [r[1] for r in successful_requests]
            
            success_rate = len(successful_requests) / len(valid_results)
            avg_response_time = statistics.mean(response_times) if response_times else 0
            
            assert success_rate >= 0.8, f"Async success rate {success_rate:.2f} below 80%"
            assert avg_response_time < 5.0, f"Async avg response time {avg_response_time:.3f}s exceeds 5s"
            
            print(f"Async concurrent - Success rate: {success_rate:.2f}, Avg time: {avg_response_time:.3f}s")

    # ========================================
    # CLEANUP AND RESOURCE MANAGEMENT TESTS
    # ========================================
    
    @pytest.mark.performance
    def test_bulk_user_cleanup_performance(self, user_emails):
        """Test performance of bulk user operations"""
        # Create multiple users
        created_users = []
        create_times = []
        
        for i in range(10):
            user_data = {
                "username": f"bulk_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"bulk_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "TempPass123!"
            }
            
            start_time = time.time()
            status_code, response = client.create_user(user_emails['admin'], user_data)
            create_time = time.time() - start_time
            
            if status_code == 201:
                created_users.append(response['data']['username'])
                create_times.append(create_time)
        
        # Delete all users and measure time
        delete_times = []
        for username in created_users:
            start_time = time.time()
            status_code, response = client.delete_user(user_emails['admin'], username)
            delete_time = time.time() - start_time
            
            if status_code == 200:
                delete_times.append(delete_time)
        
        # Analyze performance
        if create_times:
            avg_create_time = statistics.mean(create_times)
            assert avg_create_time < 5.0, f"Average create time {avg_create_time:.3f}s exceeds 5s"
        
        if delete_times:
            avg_delete_time = statistics.mean(delete_times)
            assert avg_delete_time < 3.0, f"Average delete time {avg_delete_time:.3f}s exceeds 3s"
        
        print(f"Bulk operations - Create avg: {avg_create_time:.3f}s, Delete avg: {avg_delete_time:.3f}s")
