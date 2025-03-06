from tensorflow.keras.models import load_model
import numpy as np

class AccidentDetectionModel:
    class_nums = ["No Accident", "Accident"]  # Ensure correct order

    def __init__(self, model_h5_file):
        self.loaded_model = load_model(model_h5_file)

    def predict_accident(self, img):
        img = img.astype("float32") / 255.0  # Normalize
        img = np.expand_dims(img, axis=0)  # Reshape for model input

        preds = self.loaded_model.predict(img)
        return AccidentDetectionModel.class_nums[np.argmax(preds)], preds
