"""
Keras Compatibility Layer for TensorFlow 2.x

This module provides compatibility between the standalone Keras API
and the integrated TensorFlow.Keras API to help with running older
Mask R-CNN code on newer TensorFlow versions.
"""

import sys
import importlib
import warnings

# Only apply patches if we're using TensorFlow 2.x
try:
    import tensorflow as tf
    from tensorflow import keras
    tf_version = float('.'.join(tf.__version__.split('.')[:2]))
    using_tf2 = tf_version >= 2.0
except ImportError:
    using_tf2 = False
    warnings.warn("TensorFlow not found. Compatibility layer will not be applied.")

if using_tf2:
    print("Applying keras compatibility patches for TensorFlow 2.x...")
    
    # Create module mappings from keras to tf.keras
    modules_to_patch = [
        'keras.engine', 'keras.layers', 'keras.models', 'keras.utils',
        'keras.backend', 'keras.applications', 'keras.preprocessing',
        'keras.losses', 'keras.metrics', 'keras.optimizers', 'keras.callbacks'
    ]
    
    # Create each module if it doesn't exist
    for module_name in modules_to_patch:
        if module_name not in sys.modules:
            parts = module_name.split('.')
            if parts[0] == 'keras':
                # Map keras.X to tensorflow.keras.X
                tf_path = 'tensorflow.' + module_name
                try:
                    # Try to import the tensorflow version
                    tf_module = importlib.import_module(tf_path)
                    # Add it to sys.modules under the keras path
                    sys.modules[module_name] = tf_module
                except ImportError:
                    warnings.warn(f"Could not import {tf_path} for compatibility")
    
    # Special handling for keras itself
    if 'keras' not in sys.modules:
        sys.modules['keras'] = keras
    
    print("Keras compatibility patches applied successfully.") 