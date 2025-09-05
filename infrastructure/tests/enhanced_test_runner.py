#!/usr/bin/env python3
"""
Enhanced test runner with improved reporting and parallel execution
"""
import sys
import os
import unittest
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import config
from auth_helper import auth
from load_testing import run_performance_tests

@dataclass
class TestResult:
    """Enhanced test result data structure"""
    test_name: str
    status: str  # PASS, FAIL, ERROR, SKIP
    duration: float
    error_message: Optional[str] = None
    traceback: Optional[str] = None

@dataclass
class TestSuiteResult:
    """Test suite result summary"""
    suite_name: str
    total_tests: int
    passed: int
    failed: int
    errors: int
    skipped: int
    duration: float
    success_rate: float
    test_results: List[TestResult]

class EnhancedTestRunner:
    """Enhanced test runner with better reporting"""
    
    def __init__(self):
        self.results = []
        self.start_time = None
        self.end_time = None
        
    def setup_test_environment(self) -> bool:
        """Setup test environment with enhanced error handling"""
        print("🔧 Setting up test environment...")
        
        try:
            # Import here to avoid circular imports
            from run_tests import get_stack_outputs
            
            # Get stack outputs
            outputs = get_stack_outputs(config.stack_name, config.region)
            
            if not outputs:
                print(f"❌ Failed to get outputs from stack {config.stack_name}")
                return False
            
            # Set API endpoints
            api_endpoints = {
                'user_management': outputs.get('UserManagementApiUrl', '').rstrip('/'),
                'group_management': outputs.get('GroupManagementApiUrl', '').rstrip('/'),
                'shared_resources': outputs.get('SharedResourcesApiUrl', '').rstrip('/'),
                'knowledge_base': outputs.get('KnowledgeBaseApiUrl', '').rstrip('/'),
                'agent_management': outputs.get('AgentManagementApiUrl', '').rstrip('/'),
                'document': outputs.get('DocumentApiUrl', '').rstrip('/'),
                'profile': outputs.get('ProfileApiUrl', '').rstrip('/')
            }
            
            config.set_api_endpoints(api_endpoints)
            
            # Setup Cognito configuration
            user_pool_id = outputs.get('UserPoolId')
            user_pool_client_id = outputs.get('UserPoolClientId')
            identity_pool_id = outputs.get('IdentityPoolId')
            
            if not all([user_pool_id, user_pool_client_id, identity_pool_id]):
                print("❌ Missing required Cognito configuration")
                return False
                
            auth.setup_cognito(user_pool_id, user_pool_client_id, identity_pool_id)
            
            # Setup test users
            print("👥 Setting up test users...")
            if not auth.setup_test_users():
                print("⚠️  Warning: Failed to setup all test users")
                
            print("✅ Test environment setup complete!")
            print(f"📡 API Endpoints configured:")
            for name, url in api_endpoints.items():
                if url:
                    print(f"   {name}: {url}")
                else:
                    print(f"   {name}: ❌ NOT CONFIGURED")
                
            return True
            
        except Exception as e:
            print(f"❌ Test environment setup failed: {e}")
            return False
    
    def cleanup_test_environment(self):
        """Enhanced cleanup with better error handling"""
        print("🧹 Cleaning up test environment...")
        try:
            auth.cleanup_test_users()
            print("✅ Cleanup complete!")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")
    
    def run_test_module(self, module_name: str) -> TestSuiteResult:
        """Run a single test module with detailed results"""
        print(f"🧪 Running {module_name}...")
        
        start_time = time.time()
        
        try:
            # Load test module
            loader = unittest.TestLoader()
            module = __import__(module_name)
            suite = loader.loadTestsFromModule(module)
            
            # Custom test result collector
            result = unittest.TestResult()
            
            # Run tests
            suite.run(result)
            
            duration = time.time() - start_time
            
            # Process results
            test_results = []
            
            # Process successful tests
            for test in result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped):
                test_results.append(TestResult(
                    test_name=str(test),
                    status="PASS",
                    duration=0  # Individual test duration not available in basic runner
                ))
            
            # Process failures
            for test, traceback in result.failures:
                test_results.append(TestResult(
                    test_name=str(test),
                    status="FAIL",
                    duration=0,
                    error_message=traceback.split('\n')[-2] if traceback else "Test failed",
                    traceback=traceback
                ))
            
            # Process errors
            for test, traceback in result.errors:
                test_results.append(TestResult(
                    test_name=str(test),
                    status="ERROR",
                    duration=0,
                    error_message=traceback.split('\n')[-2] if traceback else "Test error",
                    traceback=traceback
                ))
            
            # Process skipped tests
            if hasattr(result, 'skipped'):
                for test, reason in result.skipped:
                    test_results.append(TestResult(
                        test_name=str(test),
                        status="SKIP",
                        duration=0,
                        error_message=reason
                    ))
            
            # Calculate metrics
            total_tests = result.testsRun
            passed = total_tests - len(result.failures) - len(result.errors)
            failed = len(result.failures)
            errors = len(result.errors)
            skipped = len(result.skipped) if hasattr(result, 'skipped') else 0
            success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
            
            suite_result = TestSuiteResult(
                suite_name=module_name,
                total_tests=total_tests,
                passed=passed,
                failed=failed,
                errors=errors,
                skipped=skipped,
                duration=duration,
                success_rate=success_rate,
                test_results=test_results
            )
            
            # Print immediate results
            status_icon = "✅" if success_rate == 100 else "⚠️" if success_rate >= 80 else "❌"
            print(f"{status_icon} {module_name}: {passed}/{total_tests} passed ({success_rate:.1f}%) in {duration:.2f}s")
            
            return suite_result
            
        except ImportError as e:
            print(f"❌ Failed to import {module_name}: {e}")
            return TestSuiteResult(
                suite_name=module_name,
                total_tests=0,
                passed=0,
                failed=0,
                errors=1,
                skipped=0,
                duration=time.time() - start_time,
                success_rate=0,
                test_results=[TestResult(
                    test_name=module_name,
                    status="ERROR",
                    duration=0,
                    error_message=f"Import error: {e}"
                )]
            )
        except Exception as e:
            print(f"❌ Unexpected error in {module_name}: {e}")
            return TestSuiteResult(
                suite_name=module_name,
                total_tests=0,
                passed=0,
                failed=0,
                errors=1,
                skipped=0,
                duration=time.time() - start_time,
                success_rate=0,
                test_results=[TestResult(
                    test_name=module_name,
                    status="ERROR",
                    duration=0,
                    error_message=f"Unexpected error: {e}"
                )]
            )
    
    def run_tests_parallel(self, test_modules: List[str], max_workers: int = 3) -> List[TestSuiteResult]:
        """Run tests in parallel for faster execution"""
        print(f"🚀 Running {len(test_modules)} test suites with {max_workers} workers...")
        
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all test modules
            future_to_module = {
                executor.submit(self.run_test_module, module): module 
                for module in test_modules
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_module):
                module = future_to_module[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"❌ Error running {module}: {e}")
                    results.append(TestSuiteResult(
                        suite_name=module,
                        total_tests=0,
                        passed=0,
                        failed=0,
                        errors=1,
                        skipped=0,
                        duration=0,
                        success_rate=0,
                        test_results=[TestResult(
                            test_name=module,
                            status="ERROR",
                            duration=0,
                            error_message=str(e)
                        )]
                    ))
        
        return results
    
    def generate_report(self, results: List[TestSuiteResult], output_file: str = None):
        """Generate comprehensive test report"""
        # Calculate overall metrics
        total_tests = sum(r.total_tests for r in results)
        total_passed = sum(r.passed for r in results)
        total_failed = sum(r.failed for r in results)
        total_errors = sum(r.errors for r in results)
        total_skipped = sum(r.skipped for r in results)
        total_duration = sum(r.duration for r in results)
        overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        # Generate report
        report = {
            "timestamp": datetime.now().isoformat(),
            "environment": {
                "stack_name": config.stack_name,
                "region": config.region,
                "environment": config.environment
            },
            "summary": {
                "total_tests": total_tests,
                "passed": total_passed,
                "failed": total_failed,
                "errors": total_errors,
                "skipped": total_skipped,
                "duration": total_duration,
                "success_rate": overall_success_rate
            },
            "test_suites": [asdict(result) for result in results]
        }
        
        # Print console report
        print(f"\n{'='*80}")
        print(f"🎯 COMPREHENSIVE TEST REPORT")
        print(f"{'='*80}")
        print(f"📊 Overall Results:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {total_passed}")
        print(f"   ❌ Failed: {total_failed}")
        print(f"   🔥 Errors: {total_errors}")
        print(f"   ⏭️  Skipped: {total_skipped}")
        print(f"   ⏱️  Duration: {total_duration:.2f}s")
        print(f"   📈 Success Rate: {overall_success_rate:.1f}%")
        
        print(f"\n📋 Test Suite Breakdown:")
        for result in results:
            status_icon = "✅" if result.success_rate == 100 else "⚠️" if result.success_rate >= 80 else "❌"
            print(f"   {status_icon} {result.suite_name}: {result.passed}/{result.total_tests} "
                  f"({result.success_rate:.1f}%) - {result.duration:.2f}s")
        
        # Show failures and errors
        if total_failed > 0 or total_errors > 0:
            print(f"\n🔍 Issues Found:")
            for result in results:
                for test_result in result.test_results:
                    if test_result.status in ['FAIL', 'ERROR']:
                        print(f"   {test_result.status}: {test_result.test_name}")
                        if test_result.error_message:
                            print(f"      {test_result.error_message}")
        
        # Save to file if requested
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(report, f, indent=2)
                print(f"📄 Report saved to: {output_file}")
            except Exception as e:
                print(f"⚠️  Failed to save report: {e}")
        
        return report
    
    def run_full_test_suite(self, test_modules: List[str] = None, 
                           parallel: bool = True, max_workers: int = 3,
                           include_performance: bool = False,
                           output_file: str = None) -> bool:
        """Run complete test suite with all enhancements"""
        self.start_time = time.time()
        
        print("🎯 Enhanced API Test Suite")
        print("=" * 80)
        
        # Setup environment
        if not self.setup_test_environment():
            print("❌ Failed to setup test environment")
            return False
        
        try:
            # Default test modules
            if test_modules is None:
                test_modules = [
                    'test_user_management',
                    'test_group_management',
                    'test_shared_resources',
                    'test_knowledge_base',
                    'test_agent_management'
                ]
            
            # Run functional tests
            if parallel and len(test_modules) > 1:
                results = self.run_tests_parallel(test_modules, max_workers)
            else:
                results = [self.run_test_module(module) for module in test_modules]
            
            # Run performance tests if requested
            if include_performance:
                print("\n🚀 Running Performance Tests...")
                try:
                    import asyncio
                    asyncio.run(run_performance_tests())
                except Exception as e:
                    print(f"⚠️  Performance tests failed: {e}")
            
            # Generate report
            self.end_time = time.time()
            report = self.generate_report(results, output_file)
            
            # Determine overall success
            overall_success = all(r.success_rate == 100 for r in results)
            
            if overall_success:
                print("\n🎉 ALL TESTS PASSED!")
            else:
                print("\n⚠️  SOME TESTS FAILED!")
            
            return overall_success
            
        except KeyboardInterrupt:
            print("\n⏹️  Test execution interrupted by user")
            return False
        except Exception as e:
            print(f"\n💥 Unexpected error during test execution: {e}")
            return False
        finally:
            # Cleanup
            self.cleanup_test_environment()

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(description='Enhanced API Test Runner')
    parser.add_argument('--modules', nargs='+', help='Specific test modules to run')
    parser.add_argument('--sequential', action='store_true', help='Run tests sequentially instead of parallel')
    parser.add_argument('--workers', type=int, default=3, help='Number of parallel workers (default: 3)')
    parser.add_argument('--performance', action='store_true', help='Include performance tests')
    parser.add_argument('--output', help='Output file for test report (JSON format)')
    
    args = parser.parse_args()
    
    # Create and run test runner
    runner = EnhancedTestRunner()
    
    success = runner.run_full_test_suite(
        test_modules=args.modules,
        parallel=not args.sequential,
        max_workers=args.workers,
        include_performance=args.performance,
        output_file=args.output
    )
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
