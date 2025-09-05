#!/usr/bin/env python3
"""
Admin Operations Test Runner
Comprehensive test execution for Admin Operations
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
        '--html', f'{output_dir}/admin_operations_report.html',
        '--self-contained-html',
        '--cov=.',
        '--cov-report', f'html:{output_dir}/admin_coverage',
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

def run_all_admin_tests():
    """Run all admin operations tests"""
    print("🔐 Admin Operations - Comprehensive Test Suite")
    print("=" * 60)
    
    test_files = [
        'test_admin_operations_core.py',
        'test_admin_operations_groups.py',
        'test_admin_operations_security.py'
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
        print(f"✅ All Admin Operations tests completed successfully in {duration:.2f}s")
    else:
        print(f"❌ Some Admin Operations tests failed after {duration:.2f}s")
    print(f"{'='*60}")
    
    return success

def run_admin_test_category(category: str):
    """Run specific category of admin tests"""
    print(f"🔐 Admin Operations - {category.title()} Tests")
    print("=" * 60)
    
    category_configs = {
        'core': {
            'files': ['test_admin_operations_core.py'],
            'markers': None
        },
        'groups': {
            'files': ['test_admin_operations_groups.py'],
            'markers': None
        },
        'security': {
            'files': ['test_admin_operations_security.py'],
            'markers': ['security']
        },
        'admin_only': {
            'files': ['test_admin_operations_core.py', 'test_admin_operations_groups.py'],
            'markers': ['admin_only']
        },
        'integration': {
            'files': ['test_admin_operations_core.py', 'test_admin_operations_groups.py'],
            'markers': ['integration']
        },
        'performance': {
            'files': ['test_admin_operations_core.py', 'test_admin_operations_groups.py'],
            'markers': ['performance or not slow']
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

def run_admin_smoke_tests():
    """Run quick admin smoke tests"""
    print("🚀 Admin Operations - Smoke Tests")
    print("=" * 60)
    
    start_time = time.time()
    success = run_pytest_tests(
        ['test_admin_operations_core.py'],
        ['admin_only and not slow and not security']
    )
    duration = time.time() - start_time
    
    print(f"\n{'='*60}")
    if success:
        print(f"✅ Admin smoke tests completed successfully in {duration:.2f}s")
    else:
        print(f"❌ Some admin smoke tests failed after {duration:.2f}s")
    print(f"{'='*60}")
    
    return success

def validate_admin_test_environment():
    """Validate admin test environment setup"""
    print("🔧 Validating admin test environment...")
    
    try:
        from test_config import config
        from auth_helper import auth
        from api_client import client
        
        # Check admin user configuration
        if 'admin' not in config.test_users:
            print("❌ Admin user not configured")
            return False
        
        admin_email = config.test_users['admin']['email']
        if not admin_email:
            print("❌ Admin email not configured")
            return False
        
        # Try to setup test environment
        from run_tests import setup_test_environment
        if not setup_test_environment():
            print("❌ Failed to setup test environment")
            return False
        
        # Test admin access
        status_code, response = client.list_users(admin_email)
        if status_code != 200:
            print(f"❌ Admin user cannot access admin operations (status: {status_code})")
            return False
        
        print("✅ Admin test environment validation passed")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Admin environment validation error: {e}")
        return False

def generate_admin_test_report():
    """Generate comprehensive admin test report"""
    print("📊 Generating Admin Operations Test Report")
    print("=" * 60)
    
    # Run all test categories with detailed reporting
    test_categories = [
        ('Core Admin Functions', 'core'),
        ('Group Management', 'groups'),
        ('Security Operations', 'security'),
        ('Integration Tests', 'integration')
    ]
    
    results = {}
    total_start_time = time.time()
    
    for category_name, category_key in test_categories:
        print(f"\n🔐 Running {category_name}...")
        start_time = time.time()
        success = run_admin_test_category(category_key)
        duration = time.time() - start_time
        
        results[category_name] = {
            'success': success,
            'duration': duration
        }
    
    total_duration = time.time() - total_start_time
    
    # Print summary report
    print(f"\n{'='*80}")
    print("📋 ADMIN OPERATIONS TEST SUMMARY REPORT")
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
        print("🎉 ALL ADMIN OPERATIONS TESTS PASSED!")
    elif success_rate >= 80:
        print("⚠️  MOST TESTS PASSED - Some issues detected")
    else:
        print("❌ SIGNIFICANT TEST FAILURES - Review required")
    
    print(f"{'='*80}")
    print("📄 Detailed reports available in: reports/")
    print("   - HTML Report: reports/admin_operations_report.html")
    print("   - Coverage Report: reports/admin_coverage/index.html")
    print(f"{'='*80}")
    
    return success_rate == 100

def run_admin_security_audit():
    """Run comprehensive admin security audit"""
    print("🛡️  Admin Security Audit")
    print("=" * 60)
    
    start_time = time.time()
    success = run_pytest_tests(
        ['test_admin_operations_security.py'],
        ['security']
    )
    duration = time.time() - start_time
    
    print(f"\n{'='*60}")
    if success:
        print(f"✅ Admin security audit completed successfully in {duration:.2f}s")
        print("🛡️  No security vulnerabilities detected")
    else:
        print(f"❌ Admin security audit found issues after {duration:.2f}s")
        print("⚠️  Review security test failures immediately")
    print(f"{'='*60}")
    
    return success

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(
        description='Admin Operations Test Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_admin_operations_tests.py --all                    # Run all admin tests
  python run_admin_operations_tests.py --category core          # Run core admin tests
  python run_admin_operations_tests.py --smoke                  # Run smoke tests
  python run_admin_operations_tests.py --security-audit        # Run security audit
  python run_admin_operations_tests.py --validate              # Validate environment
  python run_admin_operations_tests.py --report                # Generate full report
        """
    )
    
    parser.add_argument('--all', action='store_true', 
                       help='Run all admin operations tests')
    parser.add_argument('--category', choices=[
        'core', 'groups', 'security', 'admin_only', 
        'integration', 'performance'
    ], help='Run specific category of admin tests')
    parser.add_argument('--smoke', action='store_true',
                       help='Run quick admin smoke tests')
    parser.add_argument('--security-audit', action='store_true',
                       help='Run comprehensive security audit')
    parser.add_argument('--validate', action='store_true',
                       help='Validate admin test environment only')
    parser.add_argument('--report', action='store_true',
                       help='Generate comprehensive admin test report')
    parser.add_argument('--output-dir', default='reports',
                       help='Output directory for reports (default: reports)')
    
    args = parser.parse_args()
    
    # Validate environment first
    if not validate_admin_test_environment():
        print("❌ Admin environment validation failed. Please check your configuration.")
        sys.exit(1)
    
    if args.validate:
        print("✅ Admin environment validation completed successfully.")
        sys.exit(0)
    
    success = False
    
    if args.all:
        success = run_all_admin_tests()
    elif args.category:
        success = run_admin_test_category(args.category)
    elif args.smoke:
        success = run_admin_smoke_tests()
    elif args.security_audit:
        success = run_admin_security_audit()
    elif args.report:
        success = generate_admin_test_report()
    else:
        # Default to smoke tests
        print("No specific test type specified. Running admin smoke tests...")
        success = run_admin_smoke_tests()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
