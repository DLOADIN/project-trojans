import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from keras.models import Sequential
from keras.layers import Dense, GlobalAveragePooling2D, BatchNormalization, Dropout
from keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from keras.preprocessing.image import ImageDataGenerator
from keras.applications import ResNet50V2
from keras.optimizers import Adam
from keras.metrics import Precision, Recall

# Create model directory if it doesn't exist
os.makedirs('model', exist_ok=True)

# Optimized parameters
BATCH_SIZE = 16  # Smaller batch size for better generalization
IMG_HEIGHT = 224  # Standard size for ResNet
IMG_WIDTH = 224   # Standard size for ResNet
EPOCHS = 100      # More epochs with early stopping
LEARNING_RATE = 1e-4  # Lower learning rate for better convergence

# Enhanced data augmentation
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.3,
    horizontal_flip=True,
    vertical_flip=False,  # Cars don't usually flip vertically
    fill_mode='nearest',
    brightness_range=[0.7, 1.3]  # Brightness augmentation
)

valid_datagen = ImageDataGenerator(rescale=1./255)
test_datagen = ImageDataGenerator(rescale=1./255)

# Load and preprocess data
train_data = train_datagen.flow_from_directory(
    'data/train',
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=True
)

validation_data = valid_datagen.flow_from_directory(
    'data/val',
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

test_data = test_datagen.flow_from_directory(
    'data/test',
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

# Calculate class weights
train_classes = train_data.classes
class_counts = np.bincount(train_classes)
total_samples = sum(class_counts)
class_weights = {i: total_samples / (len(class_counts) * count) for i, count in enumerate(class_counts)}

# Visualize class distribution
plt.figure(figsize=(10, 6))
class_names = list(train_data.class_indices.keys())
plt.bar(class_names, class_counts)
plt.title('Class Distribution in Training Set')
plt.xlabel('Class')
plt.ylabel('Number of Samples')
plt.savefig('class_distribution.png')
plt.close()

def build_model():
    # Use ResNet50V2 as base model
    base_model = ResNet50V2(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_HEIGHT, IMG_WIDTH, 3)
    )
    
    # Freeze the base model
    base_model.trainable = False
    
    # Create the model using Sequential API
    model = Sequential()
    
    # Add the base model
    model.add(base_model)
    
    # Add custom layers
    model.add(GlobalAveragePooling2D())
    model.add(BatchNormalization())
    model.add(Dense(512, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dropout(0.5))
    model.add(Dense(256, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dropout(0.3))
    model.add(Dense(2, activation='softmax'))
    
    return model

# Build and compile model
model = build_model()

# Create optimizer with explicit learning rate
optimizer = Adam(learning_rate=LEARNING_RATE)

# Create metrics
precision_metric = Precision(name='precision')
recall_metric = Recall(name='recall')

# Compile model with metrics
model.compile(
    optimizer=optimizer,
    loss='categorical_crossentropy',
    metrics=['accuracy', precision_metric, recall_metric]
)

# Callbacks
early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.2,
    patience=7,
    min_lr=1e-7,
    verbose=1
)

checkpoint = ModelCheckpoint(
    "model/accident_detection_model_weights.h5",
    monitor='val_accuracy',
    save_best_only=True,
    mode='max',
    verbose=1
)

# Train the model
history = model.fit(
    train_data,
    validation_data=validation_data,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stopping, reduce_lr],
    class_weight=class_weights
)

# Evaluate on test set
test_results = model.evaluate(test_data)
print("\nTest Results:")
for metric, value in zip(model.metrics_names, test_results):
    print(f"{metric}: {value:.4f}")

# Generate predictions
predictions = model.predict(test_data)
y_pred = np.argmax(predictions, axis=1)
y_true = test_data.classes

# Confusion Matrix
plt.figure(figsize=(10, 8))
cm = confusion_matrix(y_true, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=class_names, yticklabels=class_names)
plt.title('Confusion Matrix')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.savefig('confusion_matrix.png')
plt.close()

# Classification Report
print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=class_names))

# Training history visualization
plt.figure(figsize=(15, 5))

plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Training Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Model Accuracy')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Training Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Model Loss')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()

plt.tight_layout()
plt.savefig('training_history.png')
plt.close()

# Save the model architecture and weights
model_json = model.to_json()
with open("model/accident_detection_model.json", "w") as json_file:
    json_file.write(model_json)

model.save_weights("model/accident_detection_model_weights.h5")
print("\nModel architecture and weights have been saved in the 'model' directory") 