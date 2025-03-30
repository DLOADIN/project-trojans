from tensorflow.keras.models import model_from_json
import numpy as np

class AccidentDetectionModel:
    class_nums = ["No Accident", "Accident"]  # Ensure correct order

    def __init__(self, model_json_file, model_weights_file):
        # Load model architecture from JSON
        with open(model_json_file, 'r') as json_file:
            model_json = json_file.read()
            
        # Create model from JSON and load weights
        self.loaded_model = model_from_json(model_json)
        self.loaded_model.load_weights(model_weights_file)
        
        # Compile the model
        self.loaded_model.compile(loss='sparse_categorical_crossentropy', 
                                  optimizer='adam', 
                                  metrics=['accuracy'])

    def predict_accident(self, img):
        img = img.astype("float32") / 255.0 
        
        # Make prediction
        preds = self.loaded_model.predict(img)
        # Return class name and probabilities
        return AccidentDetectionModel.class_nums[np.argmax(preds)], preds