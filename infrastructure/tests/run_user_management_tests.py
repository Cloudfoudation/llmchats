#!/usr/bin/env python3
"""
User Management Test Runner
Comprehensive test execution for User Management API
"""
import sys
import os
import argparse
import time
from typing import List, Dict, Any

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_pytest_tests(test_files: List[str], markers: List[str] = None, 
                    output_dir: str = "reports", verbose: bool = True) -> bool:
    """Run pytest-based tests"""
    import pytest
    
    # Prepare pytest arguments
    args = []
    
    # Add test files
    args.extend(test_files)
    
    # Add markers if specified
    if markers:
        for marker in markers:
            args.extend(['-m', marker])
    
    # Add output options
    os.makedirs(output_dir, exist_ok=True)
    args.extend([
        '--html', f'{output_dir}/user_management_report.html',
        '--self-contained-html',
        '--cov=.',
        '--cov-report', f'html:{output_dir}/coverage',
        '--cov-report', 'term-missing'
    ])
    
    # Add verbosity
    if verbose:
        args.append('-v')
    
    # Add other useful options
    args.extend([
        '--tb=short',
        '--strict-markers',
        '--disable-warnings'
    ])
    
    print(f"Running pytest with args: {' '.join(args)}")
    
    # Run pytest
    exit_code = pytest.main(args)
    return exit_code == 0

def run_comprehensive_tests():
    """Run all user management tests"""
    print("🧪 User Management API - Comprehensive Test Suite")
    print("=" * 60)
    
    test_files = [
        'test_user_management_comprehensive.py',
        'test_user_management_edge_cases.py',
        'test_user_management_load.py'
    ]
    
    # Check if test files exist
    missing_files = []
    for test_file in test_files:
        if not os.path.exists(test_file):
            missing_files.append(test_file)
    
    if missing_files:
        print(f"❌ Missing test files: {', '.join(missing_files)}")
        return False
    
    start_time = time.time()
    success = run_pytest_tests(test_files)
    duration = time.time() - start_time
    
    print(f"\n{'='*60}")
    if success:
        print(f"✅ All User Management tests completed successfully in {duration:.2f}s")
    else:
        print(f"❌ Some User Management tests failed after {duration:.2f}s")
    print(f"{'='*60}")
    
    return success

def run_specific_test_category(category: str):
    """Run specific category of tests"""
    print(f"🧪 User Management API - {category.title()} Tests")
    print("=" * 60)
    
    category_configs = {
        'basic': {
            'files': ['test_user_management_comprehensive.py'],
            'markers': ['not slow and not performance']
        },
        'admin': {
            'files': ['test_user_management_comprehensive.py'],
            'markers': ['admin_only']
        },
        'security': {
            'files': ['test_user_management_comprehensive.py', 'test_user_management_edge_cases.py'],
            'markers': ['security']
        },
        'performance': {
            'files': ['test_user_management_load.py'],
            'markers': ['performance']
        },
        'integration': {
            'files': ['test_user_management_comprehensive.py'],
            'markers': ['integration']
        },
        'edge_cases': {
            'files': ['test_user_management_edge_cases.py'],
            'markers': None
        },
        'load': {
            'files': ['test_user_management_load.py'],
            'markers': None
        }
    }
    
    if category not in category_configs:
        print(f"❌ Unknown category: {category}")
        print(f"Available categories: {', '.join(category_configs.keys())}")
        return False
    
    config = category_configs[category]
    start_time = time.time()
    success = run_pytest_tests(config['files'], config.get('markers'))
    duration = time.time() - start_time
    
    print(f"\n{'='*60}")
    if success:
        print(f"✅ {category.title()} tests completed successfully in {duration:.2f}s")
    else:
        print(f"❌ Some {category.title()} tests failed after {duration:.2f}s")
    print(f"{'='*60}")
    
    return success

def run_smoke_tests():
    """Run quick smoke tests"""
    print("🚀 User Management API - Smoke Tests")
    print("=" * 60)
    
    start_time = time.time()
    success = run_pytest_tests(
        ['test_user_management_comprehensive.py'],
        ['smoke or (admin_only and not slow)']
    )
    duration = time.time() - start_time
    
    print(f"\n{'='*60}")
    if success:
        print(f"✅ Smoke tests completed successfully in {duration:.2f}s")
    else:
        print(f"❌ Some smoke tests failed after {duration:.2f}s")
    print(f"{'='*60}")
    
    return success

def validate_test_environment():
    """Validate test environment setup"""
    print("🔧 Validating test environment...")
    
    try:
        from test_config import config
        from auth_helper import auth
        from api_client import client
        
        # Check configuration
        if not config.stack_name:
            print("❌ Stack name not configured")
            return False
        
        if not config.region:
            print("❌ Region not configured")
            return False
        
        if not config.test_users:
            print("❌ Test users not configured")
            return False
        
        # Try to setup test environment
        from run_tests import setup_test_environment
        if not setup_test_environment():
            print("❌ Failed to setup test environment")
            return False
        
        print("✅ Test environment validation passed")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Environment validation error: {e}")
        return False

def generate_test_report():
    """Generate comprehensive test report"""
    print("📊 Generating User Management Test Report")
    print("=" * 60)
    
    # Run all tests with detailed reporting
    test_categories = [
        ('Basic Functionality', 'basic'),
        ('Admin Operations', 'admin'),
        ('Security Tests', 'security'),
        ('Edge Cases', 'edge_cases'),
        ('Performance Tests', 'performance'),
        ('Integration Tests', 'integration')
    ]
    
    results = {}
    total_start_time = time.time()
    
    for category_name, category_key in test_categories:
        print(f"\n🧪 Running {category_name}...")
        start_time = time.time()
        success = run_specific_test_category(category_key)
        duration = time.time() - start_time
        
        results[category_name] = {
            'success': success,
            'duration': duration
        }
    
    total_duration = time.time() - total_start_time
    
    # Print summary report
    print(f"\n{'='*80}")
    print("📋 USER MANAGEMENT TEST SUMMARY REPORT")
    print(f"{'='*80}")
    print(f"Total execution time: {total_duration:.2f}s")
    print(f"{'='*80}")
    
    passed_categories = 0
    for category_name, result in results.items():
        status = "✅ PASSED" if result['success'] else "❌ FAILED"
        print(f"{status:<12} {category_name:<25} ({result['duration']:.2f}s)")
        if result['success']:
            passed_categories += 1
    
    print(f"{'='*80}")
    success_rate = (passed_categories / len(results)) * 100
    print(f"Overall Success Rate: {success_rate:.1f}% ({passed_categories}/{len(results)} categories)")
    
    if success_rate == 100:
        print("🎉 ALL USER MANAGEMENT TESTS PASSED!")
    elif success_rate >= 80:
        print("⚠️  MOST TESTS PASSED - Some issues detected")
    else:
        print("❌ SIGNIFICANT TEST FAILURES - Review required")
    
    print(f"{'='*80}")
    print("📄 Detailed reports available in: reports/")
    print("   - HTML Report: reports/user_management_report.html")
    print("   - Coverage Report: reports/coverage/index.html")
    print(f"{'='*80}")
    
    return success_rate == 100

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(
        description='User Management API Test Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_user_management_tests.py --all                    # Run all tests
  python run_user_management_tests.py --category admin         # Run admin tests only
  python run_user_management_tests.py --smoke                  # Run smoke tests
  python run_user_management_tests.py --validate               # Validate environment
  python run_user_management_tests.py --report                 # Generate full report
        """
    )
    
    parser.add_argument('--all', action='store_true', 
                       help='Run all user management tests')
    parser.add_argument('--category', choices=[
        'basic', 'admin', 'security', 'performance', 
        'integration', 'edge_cases', 'load'
    ], help='Run specific category of tests')
    parser.add_argument('--smoke', action='store_true',
                       help='Run quick smoke tests')
    parser.add_argument('--validate', action='store_true',
                       help='Validate test environment only')
    parser.add_argument('--report', action='store_true',
                       help='Generate comprehensive test report')
    parser.add_argument('--output-dir', default='reports',
                       help='Output directory for reports (default: reports)')
    
    args = parser.parse_args()
    
    # Validate environment first
    if not validate_test_environment():
        print("❌ Environment validation failed. Please check your configuration.")
        sys.exit(1)
    
    if args.validate:
        print("✅ Environment validation completed successfully.")
        sys.exit(0)
    
    success = False
    
    if args.all:
        success = run_comprehensive_tests()
    elif args.category:
        success = run_specific_test_category(args.category)
    elif args.smoke:
        success = run_smoke_tests()
    elif args.report:
        success = generate_test_report()
    else:
        # Default to smoke tests
        print("No specific test type specified. Running smoke tests...")
        success = run_smoke_tests()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
