import math

import cv2
from fastapi import APIRouter
from ultralytics import YOLO

# --- Configuration ---
# You can choose different YOLOv8 models like:
# 'yolov8n.pt' (nano, fastest)
# 'yolov8s.pt' (small)
# 'yolov8m.pt' (medium)
# 'yolov8l.pt' (large)
# 'yolov8x.pt' (extra-large, most accurate)
MODEL_PATH = 'yolov8n.pt'
CONFIDENCE_THRESHOLD = 0.5
BOX_COLOR = (255, 0, 255) # BGR format for OpenCV (Magenta)
TEXT_COLOR = (255, 255, 255) # White

router = APIRouter()

# Example endpoint (to be implemented)
# @router.post("/vision/detect")
# async def detect_objects(...):
#     ...

# Placeholder for vision AI (object detection, etc.)
# Move your vision code here

def main():
    """
    Main function to run the real-time object detection.
    """
    # 1. Load the pre-trained YOLOv8 model
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"Error loading model: {e}")
        print(f"Please make sure the model file '{MODEL_PATH}' is accessible.")
        print("The script will attempt to download it if it's not present.")
        return

    # Get the class names from the model
    class_names = model.names
    print("Model loaded successfully. Class names:", class_names)

    # 2. Initialize webcam
    # The argument to VideoCapture can be 0 (default webcam) or 1, 2, etc., for other cameras.
    # It can also be a path to a video file.
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    # Set webcam resolution (optional)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("Webcam started. Press 'q' to quit.")

    # 3. Main loop for processing frames
    while True:
        # Read a frame from the webcam
        success, frame = cap.read()
        if not success:
            print("Error: Failed to capture frame.")
            break

        # 4. Run YOLOv8 inference on the frame
        # The 'stream=True' argument is more efficient for video processing
        results = model(frame, stream=True, verbose=False)

        # 5. Process results and draw bounding boxes
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Check if confidence score is above the threshold
                confidence = math.ceil((box.conf[0] * 100)) / 100
                if confidence > CONFIDENCE_THRESHOLD:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    # Get class ID and name
                    cls_id = int(box.cls[0])
                    class_name = class_names.get(cls_id, "Unknown")

                    # --- Draw the bounding box ---
                    cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, 2)

                    # --- Prepare and draw the label ---
                    label = f"{class_name}: {confidence:.2f}"

                    # Calculate text size to create a background rectangle
                    (text_width, text_height), baseline = cv2.getTextSize(
                        label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                    )

                    # Label background
                    cv2.rectangle(
                        frame,
                        (x1, y1 - text_height - 10),
                        (x1 + text_width, y1),
                        BOX_COLOR,
                        -1,
                    )

                    # Label text
                    cv2.putText(
                        frame,
                        label,
                        (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        TEXT_COLOR,
                        2,
                    )


        # 6. Display the resulting frame
        cv2.imshow("YOLOv8 Real-time Object Detection", frame)

        # 7. Check for quit key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # 8. Clean up
    print("Releasing resources...")
    cap.release()
    cv2.destroyAllWindows()
    print("Done.")

if __name__ == "__main__":
    main()
