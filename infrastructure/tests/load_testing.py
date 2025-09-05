"""
Load testing utilities for API performance validation
"""
import asyncio
import aiohttp
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Callable
from dataclasses import dataclass
from test_config import config
from auth_helper import auth

@dataclass
class LoadTestResult:
    """Load test result data structure"""
    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    requests_per_second: float
    error_rate: float
    errors: List[str]

class LoadTester:
    """Load testing utility class"""
    
    def __init__(self):
        self.session = None
        self.results = []
    
    async def create_session(self):
        """Create aiohttp session"""
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={'Content-Type': 'application/json'}
        )
    
    async def close_session(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, url: str, headers: Dict = None, 
                          data: Dict = None) -> Tuple[int, float, str]:
        """Make async HTTP request"""
        start_time = time.time()
        error_msg = ""
        
        try:
            request_headers = headers or {}
            async with self.session.request(
                method=method,
                url=url,
                headers=request_headers,
                json=data
            ) as response:
                await response.text()  # Consume response body
                status_code = response.status
                
        except Exception as e:
            status_code = 500
            error_msg = str(e)
        
        response_time = time.time() - start_time
        return status_code, response_time, error_msg
    
    async def run_concurrent_requests(self, method: str, url: str, 
                                    concurrent_users: int, requests_per_user: int,
                                    headers: Dict = None, data: Dict = None) -> List[Tuple]:
        """Run concurrent requests"""
        tasks = []
        
        for _ in range(concurrent_users * requests_per_user):
            task = asyncio.create_task(
                self.make_request(method, url, headers, data)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if not isinstance(r, Exception)]
    
    def analyze_results(self, endpoint: str, results: List[Tuple], 
                       test_duration: float) -> LoadTestResult:
        """Analyze load test results"""
        total_requests = len(results)
        successful_requests = sum(1 for r in results if r[0] < 400)
        failed_requests = total_requests - successful_requests
        
        response_times = [r[1] for r in results]
        errors = [r[2] for r in results if r[2]]
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
        else:
            avg_response_time = min_response_time = max_response_time = p95_response_time = 0
        
        requests_per_second = total_requests / test_duration if test_duration > 0 else 0
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0
        
        return LoadTestResult(
            endpoint=endpoint,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            p95_response_time=p95_response_time,
            requests_per_second=requests_per_second,
            error_rate=error_rate,
            errors=errors[:10]  # Keep first 10 errors
        )
    
    async def load_test_endpoint(self, endpoint: str, method: str = 'GET',
                               concurrent_users: int = 10, requests_per_user: int = 10,
                               user_email: str = None, data: Dict = None) -> LoadTestResult:
        """Load test a specific endpoint"""
        print(f"Starting load test: {method} {endpoint}")
        print(f"Concurrent users: {concurrent_users}, Requests per user: {requests_per_user}")
        
        # Prepare headers
        headers = {}
        if user_email:
            headers.update(auth.get_auth_headers(user_email))
        
        # Run test
        start_time = time.time()
        results = await self.run_concurrent_requests(
            method, endpoint, concurrent_users, requests_per_user, headers, data
        )
        test_duration = time.time() - start_time
        
        # Analyze results
        result = self.analyze_results(endpoint, results, test_duration)
        self.results.append(result)
        
        return result
    
    def print_results(self, result: LoadTestResult):
        """Print load test results"""
        print(f"\n{'='*60}")
        print(f"LOAD TEST RESULTS: {result.endpoint}")
        print(f"{'='*60}")
        print(f"Total Requests: {result.total_requests}")
        print(f"Successful: {result.successful_requests}")
        print(f"Failed: {result.failed_requests}")
        print(f"Error Rate: {result.error_rate:.2f}%")
        print(f"Requests/Second: {result.requests_per_second:.2f}")
        print(f"\nResponse Times:")
        print(f"  Average: {result.avg_response_time:.3f}s")
        print(f"  Min: {result.min_response_time:.3f}s")
        print(f"  Max: {result.max_response_time:.3f}s")
        print(f"  95th Percentile: {result.p95_response_time:.3f}s")
        
        if result.errors:
            print(f"\nSample Errors:")
            for error in result.errors[:5]:
                print(f"  - {error}")
    
    async def run_load_test_suite(self, test_scenarios: List[Dict]):
        """Run complete load test suite"""
        await self.create_session()
        
        try:
            for scenario in test_scenarios:
                result = await self.load_test_endpoint(**scenario)
                self.print_results(result)
                
                # Wait between tests
                await asyncio.sleep(2)
                
        finally:
            await self.close_session()
        
        return self.results

# Predefined load test scenarios
def get_load_test_scenarios() -> List[Dict]:
    """Get predefined load test scenarios"""
    admin_email = config.test_users['admin']['email']
    paid_email = config.test_users['paid']['email']
    
    scenarios = [
        # User Management API
        {
            'endpoint': f"{config.get_api_url('user_management')}/users",
            'method': 'GET',
            'concurrent_users': 5,
            'requests_per_user': 10,
            'user_email': admin_email
        },
        
        # Knowledge Base API
        {
            'endpoint': f"{config.get_api_url('knowledge_base')}/knowledge-bases",
            'method': 'GET',
            'concurrent_users': 10,
            'requests_per_user': 5,
            'user_email': paid_email
        },
        
        # Agent Management API
        {
            'endpoint': f"{config.get_api_url('agent_management')}/agents",
            'method': 'GET',
            'concurrent_users': 8,
            'requests_per_user': 8,
            'user_email': paid_email
        },
        
        # Group Management API
        {
            'endpoint': f"{config.get_api_url('group_management')}/groups",
            'method': 'GET',
            'concurrent_users': 6,
            'requests_per_user': 10,
            'user_email': paid_email
        },
        
        # Create operations (lower concurrency)
        {
            'endpoint': f"{config.get_api_url('knowledge_base')}/knowledge-bases",
            'method': 'POST',
            'concurrent_users': 3,
            'requests_per_user': 2,
            'user_email': paid_email,
            'data': {
                'name': 'Load Test KB',
                'description': 'Knowledge base created during load testing',
                'embedding_model': 'amazon.titan-embed-text-v1'
            }
        }
    ]
    
    return scenarios

async def run_performance_tests():
    """Run performance tests"""
    print("Starting API Performance Tests")
    print("=" * 60)
    
    # Setup test environment
    from run_tests import setup_test_environment
    if not setup_test_environment():
        print("Failed to setup test environment")
        return
    
    # Create load tester
    tester = LoadTester()
    
    # Get test scenarios
    scenarios = get_load_test_scenarios()
    
    # Run tests
    results = await tester.run_load_test_suite(scenarios)
    
    # Print summary
    print(f"\n{'='*60}")
    print("PERFORMANCE TEST SUMMARY")
    print(f"{'='*60}")
    
    for result in results:
        print(f"{result.endpoint}: {result.requests_per_second:.2f} req/s, "
              f"{result.error_rate:.1f}% errors, "
              f"{result.avg_response_time:.3f}s avg")
    
    # Performance thresholds
    performance_issues = []
    for result in results:
        if result.avg_response_time > 2.0:
            performance_issues.append(f"{result.endpoint}: Slow response time ({result.avg_response_time:.3f}s)")
        if result.error_rate > 5.0:
            performance_issues.append(f"{result.endpoint}: High error rate ({result.error_rate:.1f}%)")
        if result.requests_per_second < 10.0:
            performance_issues.append(f"{result.endpoint}: Low throughput ({result.requests_per_second:.2f} req/s)")
    
    if performance_issues:
        print(f"\n⚠️  PERFORMANCE ISSUES DETECTED:")
        for issue in performance_issues:
            print(f"  - {issue}")
    else:
        print(f"\n✅ ALL PERFORMANCE TESTS PASSED!")

if __name__ == '__main__':
    asyncio.run(run_performance_tests())
