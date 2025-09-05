# bedrock-service/test/test_event_composer.py
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

class EventComposerClient:
    """Client for interacting with the Bedrock Event Composer API."""
    
    def __init__(self, base_url: str = "http://localhost:8000", auth_token: Optional[str] = None):
        """
        Initialize the API client.
        
        Args:
            base_url: The base URL of the API (default: http://localhost:8000)
            auth_token: Authentication token for API requests
        """
        self.base_url = base_url.rstrip('/')
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
    
    def start_event_composer(self, event_name: str, 
                           date_time: Optional[str] = None,
                           location: Optional[str] = None,
                           tone: str = "Lively") -> Dict[str, Any]:
        """
        Start a new event composition session.
        
        Args:
            event_name: Name of the event
            date_time: Optional date and time of the event
            location: Optional location of the event
            tone: The tone of the announcement (Lively or Formal)
            
        Returns:
            Dict containing task_id and status information
        """
        url = f"{self.base_url}/start"
        payload = {
            "event_name": event_name,
            "date_time": date_time,
            "location": location,
            "tone": tone
        }
        
        try:
            print(f"Starting event composer request to {url}")
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
    
    def get_event_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check the status of an event composition task.
        
        Args:
            task_id: The ID of the task to check
            
        Returns:
            Dict containing status and conversation information
        """
        url = f"{self.base_url}/{task_id}/status"
        
        try:
            response = requests.get(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting event status: {str(e)}")
            raise
    
    def send_message(self, task_id: str, message: str) -> Dict[str, Any]:
        """
        Send a message in the event composer conversation.
        
        Args:
            task_id: The ID of the task
            message: The message to send
            
        Returns:
            Dict containing updated conversation
        """
        url = f"{self.base_url}/{task_id}/chat"
        payload = {
            "message": message
        }
        
        try:
            print(f"Sending message: '{message}'")
            response = requests.post(url, json=payload, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error sending message: {str(e)}")
            raise
    
    def accept_announcement(self, task_id: str) -> Dict[str, Any]:
        """
        Accept an announcement to proceed with image generation.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing the response
        """
        url = f"{self.base_url}/{task_id}/accept-announcement"
        
        try:
            print(f"Accepting announcement for task {task_id}")
            response = requests.post(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error accepting announcement: {str(e)}")
            raise
    
    def get_preview_images(self, task_id: str) -> Dict[str, Any]:
        """
        Get the preview images generated for the event.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing preview images information
        """
        url = f"{self.base_url}/{task_id}/preview-images"
        
        try:
            print(f"Getting preview images for task {task_id}")
            response = requests.get(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting preview images: {str(e)}")
            raise
    
    def provide_image_feedback(self, task_id: str, 
                            selected_images: List[int],
                            feedback: Optional[str] = None,
                            regenerate: bool = True) -> Dict[str, Any]:
        """
        Provide feedback on the generated preview images.
        
        Args:
            task_id: The ID of the task
            selected_images: List of indices of selected images (0-based)
            feedback: Optional textual feedback for the selected images
            regenerate: Whether to regenerate images based on feedback
            
        Returns:
            Dict containing the response
        """
        url = f"{self.base_url}/{task_id}/image-feedback"
        payload = {
            "selected_images": selected_images,
            "regenerate": regenerate
        }
        
        if feedback:
            payload["feedback"] = feedback
        
        try:
            print(f"Providing feedback on images: Selected {len(selected_images)} images")
            if regenerate:
                print(f"Requesting image regeneration with feedback: '{feedback}'")
            response = requests.post(url, json=payload, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error providing image feedback: {str(e)}")
            raise
    
    def accept_images(self, task_id: str) -> Dict[str, Any]:
        """
        Accept the current images and proceed to video prompt generation.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing the response
        """
        url = f"{self.base_url}/{task_id}/accept-images"
        
        try:
            print(f"Accepting images for task {task_id}")
            response = requests.post(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error accepting images: {str(e)}")
            raise
    
    def update_system_prompt(self, task_id: str, agent_type: str, system_prompt: str) -> Dict[str, Any]:
        """
        Update system prompt for announcement generator, image generator, or video generator.
        
        Args:
            task_id: The ID of the task
            agent_type: The type of agent ('announcement', 'image', or 'video')
            system_prompt: The new system prompt to use
            
        Returns:
            Dict containing status of the update operation
        """
        url = f"{self.base_url}/{task_id}/system-prompts"
        
        # Create the right payload based on agent type
        payload = {}
        if agent_type == 'announcement':
            payload["announcement_prompt"] = system_prompt
        elif agent_type == 'video':
            payload["video_prompt"] = system_prompt
        elif agent_type == 'image':
            payload["image_prompt"] = system_prompt
        else:
            raise ValueError(f"Unknown agent_type: {agent_type}. Must be 'announcement', 'image', or 'video'")
        
        try:
            print(f"Updating {agent_type} prompt")
            response = requests.put(url, json=payload, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error updating system prompt: {str(e)}")
            raise
    
    def generate_video_prompts(self, task_id: str) -> Dict[str, Any]:
        """
        Generate video prompts based on the finalized announcement and image feedback.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing the generated video prompts
        """
        url = f"{self.base_url}/{task_id}/generate-video-prompts"
        
        try:
            print("Generating video prompts from announcement and image feedback")
            response = requests.post(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error generating video prompts: {str(e)}")
            raise
            
    def generate_videos(self, task_id: str) -> Dict[str, Any]:
        """
        Generate videos based on the previously generated prompts.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Dict containing the response message
        """
        url = f"{self.base_url}/{task_id}/generate-videos"
        
        try:
            print("Generating videos from prompts")
            response = requests.post(url, headers=self.headers, verify=self._get_ssl_verify())
            if response.status_code >= 400:
                print(f"Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error generating videos: {str(e)}")
            raise
    
    def wait_for_initial_message(self, task_id: str, timeout: int = 60, interval: int = 2) -> bool:
        """
        Wait until the initial assistant message is available.
        
        Args:
            task_id: The task ID
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            True if message is ready, False if timeout occurred
        """
        print("Waiting for initial assistant message...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_event_status(task_id)
                conversation_history = status_data.get('conversation_history', [])
                
                # Check if we have at least one assistant message
                assistant_messages = [m for m in conversation_history if m.get('role') == 'assistant']
                if assistant_messages:
                    print("Initial assistant message received!")
                    
                    # Check if status has been updated to announcement_ready
                    if status_data.get('status') == 'announcement_ready':
                        print("Announcement is ready for review")
                    
                    return True
                
                if status_data.get('status') == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return False
                
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached while waiting for initial message ({timeout}s)")
        return False
    
    def wait_for_assistant_response(self, task_id: str, message_count: int = 0,
                                   timeout: int = 60, interval: int = 2) -> Optional[str]:
        """
        Wait for a new assistant response after a certain message count.
        
        Args:
            task_id: The task ID
            message_count: Wait for messages after this count
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            The assistant's message or None if timeout occurred
        """
        print(f"Waiting for assistant response...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_event_status(task_id)
                conversation_history = status_data.get('conversation_history', [])
                
                # Check if we have more messages than before
                if len(conversation_history) > message_count:
                    # Get the latest assistant message
                    assistant_messages = [m for m in conversation_history if m.get('role') == 'assistant']
                    if assistant_messages:
                        message = assistant_messages[-1].get('content', '')
                        print(f"New assistant response received! ({len(message)} chars)")
                        
                        # Check for announcement_ready status
                        if status_data.get('status') == 'announcement_ready':
                            print("Announcement is ready for review")
                        
                        return message
                
                if status_data.get('status') == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return None
                
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached waiting for assistant response ({timeout}s)")
        return None
    
    def wait_for_status(self, task_id: str, target_status: str, 
                       timeout: int = 60, interval: int = 2) -> bool:
        """
        Wait until the task reaches a specific status.
        
        Args:
            task_id: The task ID
            target_status: The status to wait for
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            True if status was reached, False if timeout occurred
        """
        print(f"Waiting for status: {target_status}...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_event_status(task_id)
                current_status = status_data.get('status')
                current_step = status_data.get('current_step', 'Unknown')
                progress = status_data.get('progress', 0)
                
                print(f"Current status: {current_status}, Step: {current_step}, Progress: {progress:.1%}")
                
                if current_status == target_status:
                    print(f"Target status {target_status} reached!")
                    return True
                
                if current_status == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return False
                
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached waiting for status {target_status} ({timeout}s)")
        return False
    
    def wait_for_images(self, task_id: str, timeout: int = 180, interval: int = 5) -> List[Dict[str, Any]]:
        """
        Wait for preview images to be generated.
        
        Args:
            task_id: The task ID
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            List of preview image information or empty list if timeout occurred
        """
        print("Waiting for preview images to be generated...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_event_status(task_id)
                status = status_data.get('status', '')
                current_step = status_data.get('current_step', 'Unknown')
                preview_images = status_data.get('preview_image_urls', [])
                
                if status == 'images_ready' and preview_images:
                    print(f"Images ready! ({len(preview_images)} images)")
                    return preview_images
                
                if status == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return []
                
                print(f"Status: {status}, Step: {current_step}, Images: {len(preview_images) if preview_images else 0}")
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached waiting for images ({timeout}s)")
        return []
    
    def wait_for_video_generation(self, task_id: str, timeout: int = 300, interval: int = 5) -> bool:
        """
        Wait for video generation to complete.
        
        Args:
            task_id: The task ID
            timeout: Maximum time to wait in seconds
            interval: Time between status checks in seconds
            
        Returns:
            True if videos were generated, False if timeout occurred
        """
        print("Waiting for video generation to complete...")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                status_data = self.get_event_status(task_id)
                status = status_data.get('status', '')
                current_step = status_data.get('current_step', 'Unknown')
                video_urls = status_data.get('video_urls', [])
                
                if status == 'completed' and video_urls:
                    print(f"Video generation completed! ({len(video_urls)} videos)")
                    return True
                
                if status == 'error':
                    error = status_data.get('error', 'Unknown error')
                    print(f"Task encountered an error: {error}")
                    return False
                
                print(f"Status: {status}, Step: {current_step}, Videos: {len(video_urls) if video_urls else 0}")
                time.sleep(interval)
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(interval)
        
        print(f"Timeout reached waiting for video generation ({timeout}s)")
        return False
    
    def conduct_conversation(self, task_id: str, messages: List[str], 
                           wait_timeout: int = 60) -> List[Dict[str, Any]]:
        """
        Conduct a conversation with the event composer by sending a series of messages.
        
        Args:
            task_id: The task ID
            messages: List of messages to send in sequence
            wait_timeout: Maximum time to wait for each assistant response
            
        Returns:
            The full conversation history
        """
        print(f"Starting conversation with {len(messages)} messages...")
        
        # First, get the current state
        status_data = self.get_event_status(task_id)
        conversation_history = status_data.get('conversation_history', [])
        
        # For each message, send and wait for response
        for i, message in enumerate(messages):
            print(f"Message {i+1}/{len(messages)}: '{message}'")
            
            # Get current message count
            current_message_count = len(conversation_history)
            
            # Send the message
            self.send_message(task_id, message)
            
            # Wait for assistant response
            assistant_response = self.wait_for_assistant_response(
                task_id, 
                message_count=current_message_count,
                timeout=wait_timeout
            )
            
            if assistant_response is None:
                print(f"Warning: No response received for message {i+1}")
                
            # Update conversation history
            status_data = self.get_event_status(task_id)
            conversation_history = status_data.get('conversation_history', [])
                
        return conversation_history
    
    def process_images_with_feedback(
        self,
        task_id: str,
        feedback_iterations: int = 0,
        image_feedback: Optional[str] = None,
        timeout: int = 180
    ) -> List[Dict[str, Any]]:
        """
        Process images with optional feedback and iterations.
        
        Args:
            task_id: The task ID
            feedback_iterations: Number of feedback iterations to perform
            image_feedback: Feedback text for image selection
            timeout: Maximum time to wait for each iteration of images
            
        Returns:
            The final list of preview images
        """
        print("Beginning image processing workflow...")
        
        # Ensure we wait for initial images
        initial_images = self.wait_for_images(task_id, timeout=timeout)
        if not initial_images:
            print("Warning: No initial preview images were generated")
            return []
            
        print(f"Initial images ready - {len(initial_images)} images")
        
        # Perform feedback iterations if requested
        for iteration in range(feedback_iterations):
            print(f"\nStarting image feedback iteration {iteration+1}/{feedback_iterations}")
            
            # Get current images
            status = self.get_event_status(task_id)
            current_images = status.get('preview_image_urls', [])
            
            if not current_images:
                print("Warning: No images available for feedback")
                break
                
            # Select all images for feedback
            selected_indices = list(range(len(current_images)))
            
            # Provide feedback with specific iteration message
            iteration_feedback = f"Iteration {iteration+1}: {image_feedback}" if image_feedback else f"Please refine these images (iteration {iteration+1})"
            print(f"Providing feedback: '{iteration_feedback}'")
            
            self.provide_image_feedback(
                task_id, 
                selected_indices, 
                feedback=iteration_feedback,
                regenerate=True
            )
            
            # Wait for new images based on feedback
            print(f"Waiting for new images from iteration {iteration+1}...")
            new_images = self.wait_for_images(task_id, timeout=timeout)
            
            if not new_images:
                print(f"Warning: No new images were generated in iteration {iteration+1}")
                break
                
            print(f"Generated {len(new_images)} new images for iteration {iteration+1}")
        
        # Get final set of images
        final_status = self.get_event_status(task_id)
        final_images = final_status.get('preview_image_urls', [])
        
        # Accept the final images to proceed with video generation
        if final_status.get('status') == 'images_ready':
            print("\nAccepting final set of images to proceed to video generation")
            self.accept_images(task_id)
        else:
            print(f"\nWarning: Cannot accept images as status is {final_status.get('status')}")
            
        return final_images
    
    def create_complete_event_announcement(
        self,
        event_name: str,
        date_time: str,
        location: str,
        tone: str = "Lively",
        conversation_messages: List[str] = None,
        generate_video: bool = True,
        custom_announcement_prompt: Optional[str] = None,
        custom_image_prompt: Optional[str] = None,
        custom_video_prompt: Optional[str] = None,
        image_feedback: Optional[str] = None,
        image_feedback_iterations: int = 0,
    ) -> Dict[str, Any]:
        """
        Create a complete event announcement with optional video generation.
        
        Args:
            event_name: Name of the event
            date_time: Date and time of the event
            location: Location of the event
            tone: Tone of the announcement (Lively or Formal)
            conversation_messages: Optional list of follow-up messages to refine the announcement
            generate_video: Whether to generate videos for the announcement
            custom_announcement_prompt: Optional custom system prompt for the announcement generator
            custom_image_prompt: Optional custom system prompt for the image generator
            custom_video_prompt: Optional custom system prompt for the video generator
            image_feedback: Optional feedback for image selection
            image_feedback_iterations: Number of image feedback iterations to perform
            
        Returns:
            Dict containing the final announcement, images, videos, and task metadata
        """
        print(f"Creating event announcement for '{event_name}'")
        
        # Start the event composition
        start_response = self.start_event_composer(event_name, date_time, location, tone)
        task_id = start_response["task_id"]
        print(f"Event composition started with ID: {task_id}")
        
        # Wait for initial assistant message
        if not self.wait_for_initial_message(task_id, timeout=120):
            raise TimeoutError("Timed out waiting for initial assistant message")
        
        # Get current status with initial message
        status = self.get_event_status(task_id)
        conversation_history = status.get('conversation_history', [])
        
        # Update system prompts if provided
        if custom_announcement_prompt:
            print("Setting custom announcement prompt")
            self.update_system_prompt(task_id, "announcement", custom_announcement_prompt)
        
        if custom_image_prompt:
            print("Setting custom image prompt")
            self.update_system_prompt(task_id, "image", custom_image_prompt)
            
        if custom_video_prompt:
            print("Setting custom video prompt")
            self.update_system_prompt(task_id, "video", custom_video_prompt)
        
        # Conduct conversation if messages provided
        if conversation_messages:
            conversation_history = self.conduct_conversation(task_id, conversation_messages)
        
        # Extract the latest announcement draft
        assistant_messages = [m for m in conversation_history if m.get('role') == 'assistant']
        if not assistant_messages:
            raise ValueError("No assistant messages found in conversation")
        
        latest_announcement = assistant_messages[-1].get('content', '')
        
        # Check if announcement is ready and formally accept it
        status = self.get_event_status(task_id)
        if status.get('status') in ['started', 'announcement_ready']:
            print("Accepting final announcement")
            self.accept_announcement(task_id)
            
            # Process images with optional feedback iterations
            if image_feedback_iterations > 0:
                print(f"Will perform {image_feedback_iterations} image feedback iterations")
                
            preview_images = self.process_images_with_feedback(
                task_id,
                feedback_iterations=image_feedback_iterations,
                image_feedback=image_feedback,
                timeout=180
            )
        
        # Generate videos if requested
        if generate_video:
            # Wait for prompts_generated status
            self.wait_for_status(task_id, "prompts_generated", timeout=120)
            
            print("Generating videos from prompts")
            self.generate_videos(task_id)
            
            # Wait for video generation to complete
            if not self.wait_for_video_generation(task_id, timeout=600):
                print("Warning: Video generation timed out or failed")
        
        # Get final status
        final_status = self.get_event_status(task_id)
        video_urls = final_status.get('video_urls', [])
        video_prompts = final_status.get('video_prompts', [])
        preview_images = final_status.get('preview_image_urls', [])
        
        return {
            "task_id": task_id,
            "final_announcement": latest_announcement,
            "conversation_history": final_status.get('conversation_history', []),
            "preview_images": preview_images,
            "video_prompts": video_prompts,
            "video_urls": video_urls,
            "status": final_status.get('status'),
            "current_step": final_status.get('current_step', ''),
            "progress": final_status.get('progress', 0),
            "announcement_system_prompt": final_status.get('announcement_system_prompt', ''),
            "image_system_prompt": final_status.get('image_system_prompt', ''),
            "video_system_prompt": final_status.get('video_system_prompt', '')
        }


# Example usage
if __name__ == "__main__":
    # API configuration
    api_base_url = os.environ.get("API_BASE_URL", "http://localhost:8000/event-composer")
    
    # Authentication credentials
    auth_token = os.environ.get("API_TOKEN")
    
    if not auth_token:
        print("Warning: No API_TOKEN provided. Authentication may be required.")
    
    # Initialize client with authentication token if available
    client = EventComposerClient(api_base_url, auth_token)
    
    try:
        # Print the client configuration for debugging
        print(f"API Base URL: {client.base_url}")
        print(f"Authentication: {'Enabled' if client.auth_token else 'Disabled'}")
        
        # Create a complete event announcement with video
        result = client.create_complete_event_announcement(
            event_name="Annual Company Picnic",
            date_time="June 15, 2024, 12:00-3:00 PM",
            location="Riverside Park, Main Pavilion",
            tone="Lively",
            conversation_messages=[
                "Can you make it more exciting?",
                "Add something about bringing family members",
                "Mention that we'll have vegetarian food options",
                "Great! This looks perfect."
            ],
            image_feedback="I like the vibrant and creative style. Please use bright colors for the videos.",
            image_feedback_iterations=1  # Do one round of feedback iteration for the images
        )
        
        print("\n========== RESULTS ==========")
        print(f"Task ID: {result['task_id']}")
        print(f"Status: {result['status']}")
        print(f"Current Step: {result['current_step']}")
        print(f"Progress: {result['progress']:.1%}")
        
        print("\n========== FINAL ANNOUNCEMENT ==========")
        print(result['final_announcement'])
        
        print("\n========== PREVIEW IMAGES ==========")
        print(f"Generated {len(result.get('preview_images', []))} preview images:")
        for i, image_info in enumerate(result.get('preview_images', [])):
            print(f"\nImage {i+1}:")
            print(f"URL: {image_info.get('url', 'N/A')}")
            print(f"Style: {image_info.get('style', 'N/A')}")
        
        print("\n========== VIDEOS ==========")
        print(f"Generated {len(result.get('video_urls', []))} videos:")
        for i, video_url in enumerate(result.get('video_urls', [])):
            print(f"\nVideo {i+1}:")
            print(f"URL: {video_url}")
            
            if i < len(result.get('video_prompts', [])):
                prompt_info = result['video_prompts'][i]
                print(f"Visual Symbol: {prompt_info.get('visual_symbol', 'N/A')}")
                print(f"Meaning: {prompt_info.get('meaning', 'N/A')}")
        
        # Save the announcement to a file
        with open("event_announcement.txt", "w", encoding="utf-8") as f:
            f.write(result['final_announcement'])
        print("\nAnnouncement saved to event_announcement.txt")
        
    except Exception as e:
        print(f"\nError: {str(e)}")