# /home/ubuntu/HRInsignt/services/functions/initialize_db/app.py

import json
import os
import psycopg2
from faker import Faker
from datetime import datetime, timedelta
import random

def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            'Access-Control-Allow-Origin': os.environ.get('ALLOWED_ORIGINS', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        }
    }

DEPARTMENTS = [
    "Human Resources", "Finance", "Information Technology", "Marketing",
    "Sales", "Research & Development", "Operations", "Customer Service",
    "Legal", "Engineering"
]

CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    dept_description TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id SERIAL PRIMARY KEY,
    dept_id INTEGER REFERENCES departments(dept_id),
    job_name VARCHAR(100) NOT NULL,
    job_description TEXT
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    job_id INTEGER REFERENCES jobs(job_id),
    salary NUMERIC(10,2),
    date_hired DATE
);
"""

CLEANUP_TABLES = """
-- Delete all data in reverse order of dependencies
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE departments CASCADE;

-- Reset the sequences
ALTER SEQUENCE employees_employee_id_seq RESTART WITH 1;
ALTER SEQUENCE jobs_job_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_dept_id_seq RESTART WITH 1;
"""

def initialize_database():
    fake = Faker()
    connection = None
    
    try:
        connection = psycopg2.connect(
            host=os.environ['DB_HOST'],
            database=os.environ['DB_NAME'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            port=os.environ['DB_PORT']
        )
        
        cursor = connection.cursor()
        
        # Create tables
        cursor.execute(CREATE_TABLES)
        
        # Clean existing data
        cursor.execute(CLEANUP_TABLES)
        
        # Generate departments
        departments = []
        for dept_name in DEPARTMENTS:
            dept_description = fake.sentence()
            cursor.execute(
                "INSERT INTO departments (dept_name, dept_description) VALUES (%s, %s) RETURNING dept_id",
                (dept_name, dept_description)
            )
            dept_id = cursor.fetchone()[0]
            departments.append(dept_id)
        
        # Generate jobs
        jobs = []
        job_titles = [fake.job() for _ in range(30)]
        for job_title in job_titles:
            dept_id = random.choice(departments)
            cursor.execute(
                "INSERT INTO jobs (dept_id, job_name, job_description) VALUES (%s, %s, %s) RETURNING job_id",
                (dept_id, job_title, fake.sentence())
            )
            job_id = cursor.fetchone()[0]
            jobs.append(job_id)
        
        # Generate employees
        start_date = datetime.now() - timedelta(days=365*5)
        for _ in range(100):
            employee_name = fake.name()
            job_id = random.choice(jobs)
            salary = round(random.uniform(30000, 120000), 2)
            date_hired = fake.date_between(start_date=start_date, end_date='today')
            
            cursor.execute(
                "INSERT INTO employees (employee_name, job_id, salary, date_hired) VALUES (%s, %s, %s, %s)",
                (employee_name, job_id, salary, date_hired)
            )
        
        connection.commit()
        
        # Get counts
        cursor.execute("SELECT COUNT(*) FROM departments")
        dept_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM jobs")
        jobs_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM employees")
        emp_count = cursor.fetchone()[0]
        
        return {
            "departments": dept_count,
            "jobs": jobs_count,
            "employees": emp_count
        }
        
    except Exception as e:
        if connection:
            connection.rollback()
        raise e
    finally:
        if connection:
            cursor.close()
            connection.close()

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {"message": "OK"})

    try:
        # Check for admin authorization here if needed
        
        stats = initialize_database()
        
        return create_response(200, {
            "success": True,
            "message": "Database initialized successfully",
            "statistics": stats
        })
        
    except Exception as e:
        return create_response(500, {
            "success": False,
            "error": str(e)
        })