import requests
import time
import json
import os
import glob
import ssl
import urllib3
from typing import Dict, List, Optional, Any, Union

# Configure SSL context for secure connections
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED

# Only disable SSL warnings for localhost testing
if os.getenv('TESTING_LOCALHOST', 'false').lower() == 'true':
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class BedrockResearchClient:
    """Client for interacting with the Bedrock Deep Research API."""
    
    def __init__(self, base_url: str = "http://localhost:8000", auth_token: Optional[str] = None):
        """
        Initialize the API client.
        
        Args:
            base_url: The base URL of the API (default: http://localhost:8000)
            auth_token: Authentication token for API requests
        """
        self.base_url = base_url.rstrip('/')
        # Extract just the base URL without additional path segments
        base_parts = self.base_url.split('/')
        self.research_endpoint = f"{'/'.join(base_parts[:3])}/research"  # Ensure correct endpoint
        self.auth_token = auth_token
        
    def _get_ssl_verify(self) -> bool:
        """
        Determine SSL verification setting based on environment and URL.
        Only disable SSL verification for localhost testing.
        """
        if 'localhost' in self.base_url or '127.0.0.1' in self.base_url:
            return os.getenv('TESTING_LOCALHOST', 'false').lower() == 'true' and False
        return True
        
    @property
    def headers(self) -> Dict[str, str]:
        """Return headers with authentication if token is available."""
        headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            headers['Authorization'] = f"Bearer {self.auth_token}"
        return headers
    
    def start_research(self, topic: str, writing_guidelines: Optional[str] = None, 
                       generate_images: bool = True) -> Dict[str, Any]:
        """
        Start a new research task.
        
        Args:
            topic: The topic to research
            writing_guidelines: Optional specific instructions for the article
            generate_images: Whether to generate header images
            
        Returns:
            Dict containing task_id and status information
        """
        url = f"{self.research_endpoint}/start"
        payload = {
            "topic": topic,
            "writing_guidelines": writing_guidelines or "Focus on practical applications and recent advancements.",
            "generate_images": generate_images
        }
        
        try:
            print(f"Starting research request to {url}")
            response = requests.post(url, json=payload, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error making request to {url}: {str(e)}")
            print(f"Full URL: {url}")
            print(f"Headers: {self.headers}")
            print(f"Payload: {payload}")
            raise
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check the status of a research task.
        
        Args:
            task_id: The ID of the task to check
            
        Returns:
            Dict containing status information
        """
        url = f"{self.research_endpoint}/{task_id}/status"
        
        try:
            response = requests.get(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting task status: {str(e)}")
            raise
    
    def get_outline(self, task_id: str) -> Dict[str, Any]:
        """
        Get the outline of a research article.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing the article outline
        """
        url = f"{self.research_endpoint}/{task_id}/outline"
        
        try:
            response = requests.get(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting outline: {str(e)}")
            raise
    
    def wait_for_outline_ready(self, task_id: str, timeout: int = 900, interval: int = 10) -> bool:
        """
        Wait until the outline is ready or timeout is reached.
        
        Args:
            task_id: The task ID
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            True if outline is ready, False if timeout occurred
        """
        print(f"Waiting for outline to be ready (timeout: {timeout}s)...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_task_status(task_id)
                status = status_data.get('status', '')
                progress = status_data.get('progress', 0)
                current_step = status_data.get('current_step', 'Unknown')
                
                print(f"Status: {status}, Progress: {progress:.1%}, Step: {current_step}")
                
                if status in ['outline_ready', 'feedback_needed']:
                    print("Outline is ready!")
                    return True
                elif status == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return False
                elif status == 'completed':
                    print("Task already completed (skipped outline stage)")
                    return True
                
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached while waiting for outline ({timeout}s)")
        return False
    
    def provide_feedback(self, task_id: str, accept_outline: bool = True) -> Dict[str, Any]:
        """
        Provide feedback on an article outline.
        
        Args:
            task_id: The ID of the task
            accept_outline: Whether to accept the outline and proceed with article generation
            
        Returns:
            Dict containing the response message
        """
        url = f"{self.research_endpoint}/{task_id}/feedback"
        payload = {
            "task_id": task_id,
            "accept_outline": accept_outline
        }
        
        print(f"Sending feedback request to {url} with payload: {payload}")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers, verify=self._get_ssl_verify())
            
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
                
                # If we get a 400 error about the task not being ready for feedback,
                # we'll wait for it to be ready and try again
                if response.status_code == 400 and "not ready for feedback" in response.text.lower():
                    print("Task not ready for feedback yet. Waiting for outline to be ready...")
                    if self.wait_for_outline_ready(task_id):
                        print("Retrying feedback submission...")
                        return self.provide_feedback(task_id, accept_outline)
                    else:
                        raise ValueError("Timed out waiting for task to be ready for feedback")
                
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error providing feedback: {str(e)}")
            raise
    
    def list_tasks(self, limit: int = 10, offset: int = 0, 
                  sort_by: str = "created_at", sort_order: str = "desc") -> Dict[str, Any]:
        """
        List all research tasks.
        
        Args:
            limit: Maximum number of tasks to return
            offset: Number of tasks to skip
            sort_by: Field to sort by (created_at, topic, status)
            sort_order: Sort order (asc, desc)
            
        Returns:
            Dict containing list of tasks and pagination info
        """
        url = f"{self.research_endpoint}/tasks?limit=10&offset=0"
        
        try:
            response = requests.get(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error listing tasks: {str(e)}")
            raise
    
    def log_task_diagnostics(self, task_id: str):
        """Print detailed diagnostics about a task."""
        try:
            status_data = self.get_task_status(task_id)
            print("\n===== TASK DIAGNOSTICS =====")
            print(f"Task ID: {task_id}")
            print(f"Status: {status_data.get('status')}")
            print(f"Progress: {status_data.get('progress')}")
            print(f"Current Step: {status_data.get('current_step')}")
            print(f"Error (if any): {status_data.get('error')}")
            print(f"Has article content: {bool(status_data.get('article'))}")
            print(f"Has article URL: {bool(status_data.get('article_url'))}")
            if status_data.get('article_url'):
                print(f"  URL: {status_data.get('article_url')}")
            print(f"Has image URL: {bool(status_data.get('image_url'))}")
            print(f"Has outline: {bool(status_data.get('outline'))}")
            print(f"Output directory: {status_data.get('output_dir')}")
            print("===========================\n")
        except Exception as e:
            print(f"Error running diagnostics: {e}")
    
    def retrieve_article_content(self, task_id: str, max_attempts: int = 5, retry_delay: int = 10) -> Dict[str, Any]:
        """
        Attempt to retrieve article content with multiple retry strategies.
        
        Args:
            task_id: The task ID
            max_attempts: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
            
        Returns:
            Dict containing article content and metadata
        """
        print(f"Attempting to retrieve article content for task {task_id}...")
        
        for attempt in range(max_attempts):
            try:
                # Get the latest task status
                status_data = self.get_task_status(task_id)
                article = status_data.get("article", "")
                article_url = status_data.get("article_url")
                image_url = status_data.get("image_url")
                outline = status_data.get("outline", {})
                title = outline.get("title", f"article_{task_id}") if isinstance(outline, dict) else "Untitled"
                
                # If we have article content directly, return it
                if article and len(article.strip()) > 0:
                    print(f"Retrieved article content from task status (length: {len(article)} chars)")
                    return {
                        "task_id": task_id,
                        "title": title,
                        "article": article,
                        "article_url": article_url,
                        "image_url": image_url,
                        "outline": outline
                    }
                
                # If we have a URL but no content, try to fetch from URL
                if article_url:
                    try:
                        print(f"Attempting to download article from URL: {article_url}")
                        response = requests.get(article_url, verify=self._get_ssl_verify(), timeout=30)
                        response.raise_for_status()
                        article = response.text
                        
                        if article and len(article.strip()) > 0:
                            print(f"Retrieved article content from URL (length: {len(article)} chars)")
                            return {
                                "task_id": task_id,
                                "title": title,
                                "article": article,
                                "article_url": article_url,
                                "image_url": image_url,
                                "outline": outline
                            }
                    except Exception as e:
                        print(f"Error retrieving article from URL: {e}")
                
                # If we're on the last attempt, try a different approach
                if attempt == max_attempts - 1:
                    # Check if there's an output directory in the task data
                    output_dir = status_data.get("output_dir")
                    if output_dir:
                        try:
                            # Try to find any markdown files in the output directory
                            md_files = glob.glob(f"{output_dir}/*.md")
                            if md_files:
                                with open(md_files[0], "r", encoding="utf-8") as f:
                                    article = f.read()
                                    print(f"Retrieved article content from local file: {md_files[0]}")
                                    return {
                                        "task_id": task_id,
                                        "title": title,
                                        "article": article, 
                                        "article_url": article_url,
                                        "image_url": image_url,
                                        "outline": outline
                                    }
                        except Exception as e:
                            print(f"Error reading from output directory: {e}")
                
                print(f"Attempt {attempt+1}/{max_attempts}: No article content found. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                
            except Exception as e:
                print(f"Error in retrieval attempt {attempt+1}: {e}")
                time.sleep(retry_delay)
        
        # If we got here, we couldn't retrieve the article
        raise ValueError(f"Failed to retrieve article content after {max_attempts} attempts")
    
    def download_article_from_url(self, url: str, output_path: str = None) -> str:
        """
        Download article content from a URL.
        
        Args:
            url: The URL to download from
            output_path: Optional path to save the content to
            
        Returns:
            The article content
        """
        try:
            print(f"Downloading article from URL: {url}")
            response = requests.get(url, verify=self._get_ssl_verify(), timeout=60)
            response.raise_for_status()
            content = response.text
            
            if output_path:
                os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Article saved to: {output_path}")
                
            return content
        except Exception as e:
            print(f"Error downloading from URL: {e}")
            raise
        
    def generate_full_article(self, topic: str, writing_guidelines: Optional[str] = None, 
                            generate_images: bool = True, polling_interval: int = 5, 
                            max_wait_time: int = 3600, save_to_file: bool = True, 
                            output_dir: str = "articles") -> Dict[str, Any]:
        """
        Generate a complete research article, handling the entire workflow.
        
        Args:
            topic: The topic to research
            writing_guidelines: Optional specific instructions for the article
            generate_images: Whether to generate header images
            polling_interval: Number of seconds between status checks
            max_wait_time: Maximum time to wait for completion in seconds
            save_to_file: Whether to save the final article to a file
            output_dir: Directory to save the article and image
            
        Returns:
            Dict containing the final article and metadata
        """
        print(f"Starting research on topic: '{topic}'")
        
        # Start the research task
        start_response = self.start_research(topic, writing_guidelines, generate_images)
        task_id = start_response["task_id"]
        print(f"Research task started with ID: {task_id}")
        
        # Wait for outline to be ready
        outline_ready = self.wait_for_outline_ready(task_id, timeout=max_wait_time, interval=polling_interval)
        
        if not outline_ready:
            raise TimeoutError(f"Timed out waiting for outline after {max_wait_time} seconds")
        
        # Get and display the outline
        print("\nRetrieving article outline...")
        try:
            outline_data = self.get_outline(task_id)
            title = outline_data.get("title", "Untitled")
            sections = outline_data.get("sections", [])
            
            print(f"Title: {title}")
            print("Sections:")
            for i, section in enumerate(sections):
                # Handle both dictionary and object representations
                section_name = section.get("name", f"Section {i+1}") if isinstance(section, dict) else getattr(section, "name", f"Section {i+1}")
                print(f"  {i+1}. {section_name}")
                
        except Exception as e:
            print(f"Error retrieving outline: {e}")
            print("Continuing with generation anyway...")
        
        # Accept the outline and generate the article
        print("\nAccepting outline and generating full article...")
        self.provide_feedback(task_id, accept_outline=True)
        
        # Monitor article generation
        article_complete = False
        start_time = time.time()
        elapsed_time = 0
        
        while not article_complete and elapsed_time < max_wait_time:
            # Check task status
            status_data = self.get_task_status(task_id)
            status = status_data["status"]
            progress = status_data.get("progress", 0)
            current_step = status_data.get("current_step", "Unknown")
            
            print(f"Status: {status}, Progress: {progress:.1%}, Step: {current_step}")
            
            if status == "completed":
                article_complete = True
            elif status == "error":
                error_msg = status_data.get("error", "Unknown error")
                raise ValueError(f"Article generation failed: {error_msg}")
            else:
                # Wait before checking again
                time.sleep(polling_interval)
                elapsed_time = time.time() - start_time
        
        if not article_complete:
            raise TimeoutError(f"Timed out waiting for article generation after {max_wait_time} seconds")
        
        # Log task diagnostics
        self.log_task_diagnostics(task_id)
        
        # Get the final article using our robust retrieval method
        try:
            result = self.retrieve_article_content(task_id)
            article = result["article"]
            article_url = result["article_url"]
            image_url = result["image_url"]
            title = result["title"]
            outline = result["outline"]
        except ValueError as e:
            print(f"WARNING: {str(e)}")
            # As a last resort, try to check if the task shows the S3 URL but no content
            final_status = self.get_task_status(task_id)
            if final_status.get("article_url"):
                print(f"Task has an article_url but content couldn't be retrieved. You may need to download it directly from: {final_status.get('article_url')}")
                
                # Try to download directly as a last resort
                try:
                    article = self.download_article_from_url(final_status.get("article_url"))
                    article_url = final_status.get("article_url")
                    image_url = final_status.get("image_url")
                    outline = final_status.get("outline", {})
                    title = outline.get("title", f"article_{task_id}") if isinstance(outline, dict) else "Untitled"
                except Exception as download_err:
                    print(f"Final attempt to download article failed: {download_err}")
                    raise ValueError("Article was marked as complete but content could not be retrieved")
            else:
                raise ValueError("Article was marked as complete but content could not be retrieved")
        
        # Save the article and image if requested
        if save_to_file:
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Get the title either from result or earlier in the process
            if 'title' in locals() and isinstance(title, str) and title != "Untitled":
                clean_title = ''.join(c if c.isalnum() else '_' for c in title)
            else:
                clean_title = f"article_{task_id}"
            
            # Save the article
            article_filename = os.path.join(output_dir, f"{clean_title}.md")
            with open(article_filename, "w", encoding="utf-8") as f:
                f.write(article)
            print(f"Article saved to: {article_filename}")
            
            # Download and save the image if it exists
            image_path = None
            if image_url:
                try:
                    # Extract file extension from URL or default to .png
                    image_ext = os.path.splitext(image_url.split('?')[0])[1]
                    if not image_ext:
                        image_ext = '.png'
                        
                    image_filename = os.path.join(output_dir, f"{clean_title}{image_ext}")
                    
                    print(f"Downloading image from: {image_url}")
                    # Download the image
                    image_response = requests.get(image_url, stream=True, verify=self._get_ssl_verify())
                    image_response.raise_for_status()
                    
                    with open(image_filename, 'wb') as img_file:
                        for chunk in image_response.iter_content(chunk_size=8192):
                            img_file.write(chunk)
                            
                    print(f"Image downloaded and saved to: {image_filename}")
                    image_path = image_filename
                except Exception as e:
                    print(f"Error downloading image: {e}")
            
        else:
            image_path = None
        
        return {
            "task_id": task_id,
            "title": title,
            "article": article,
            "article_url": article_url,
            "image_url": image_url,
            "image_path": image_path,
            "outline": outline
        }


# Example usage
if __name__ == "__main__":
    # API configuration
    api_base_url = os.environ.get("API_BASE_URL", "http://localhost:8000")
    
    # Authentication credentials
    auth_token = os.environ.get("API_TOKEN")
    
    if not auth_token:
        print("Warning: No API_TOKEN provided. Authentication may be required.")
    
    # Initialize client with authentication token if available
    client = BedrockResearchClient(api_base_url, auth_token)
    
    try:
        # Print the client configuration for debugging
        print(f"API Base URL: {client.base_url}")
        print(f"Research Endpoint: {client.research_endpoint}")
        print(f"Authentication: {'Enabled' if client.auth_token else 'Disabled'}")
        
        # Get list of existing tasks
        try:
            tasks = client.list_tasks(limit=5)
            print("\nExisting tasks:")
            for task in tasks.get('tasks', []):
                print(f"- {task.get('task_id')}: {task.get('topic')} ({task.get('status')})")
        except Exception as e:
            print(f"Could not retrieve existing tasks: {e}")
        
        # Generate a new article
        result = client.generate_full_article(
            topic="The future of quantum computing",
            writing_guidelines="Focus on recent breakthroughs and practical applications. Include code examples where relevant.",
            generate_images=True,
            polling_interval=10,  # Check status every 10 seconds
            max_wait_time=1800,   # Wait up to 30 minutes
            save_to_file=True,
            output_dir="quantum_articles"
        )
        
        print(f"\nArticle successfully generated!")
        print(f"Title: {result['title']}")
        print(f"Length: {len(result['article'])} characters")
        if result.get('image_path'):
            print(f"Image saved at: {result['image_path']}")
        
    except Exception as e:
        print(f"Error generating article: {str(e)}")