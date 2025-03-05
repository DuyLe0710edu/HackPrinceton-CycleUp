# Trash Detection with Mask R-CNN

This project uses Mask R-CNN to detect trash in images. The implementation is based on the [Matterport Mask R-CNN](https://github.com/matterport/Mask_RCNN) project, updated to work with TensorFlow 2.x.

## Requirements

- Python 3.8+
- TensorFlow 2.x
- NumPy
- SciPy
- Pillow
- Matplotlib
- scikit-image
- OpenCV

## Setup Instructions

1. **Install Dependencies**

   ```bash
   pip install tensorflow numpy scipy Pillow matplotlib scikit-image opencv-python h5py imgaug IPython requests
   ```

2. **Download Model Weights**

   Run the download script to get the COCO weights:

   ```bash
   python download_weights.py
   ```

   For the trash-specific weights, you'll need to either:
   - Train the model yourself (see Training section below)
   - Manually place pre-trained weights in the `weights` directory

3. **Verify Setup**

   Check that your environment is properly set up:

   ```bash
   python verify_setup.py
   ```

## Running Trash Detection

1. **Using the Jupyter Notebook**

   Open and run the Jupyter notebook:

   ```bash
   jupyter notebook Detect_trash_on_images.ipynb
   ```

2. **Preparing Test Images**

   Place your test images in the `images` directory.

## Training Your Own Model

To train your own model:

1. Prepare your dataset in the `trash/dataset` directory.
2. Run training:

   ```bash
   python -m trash.trash train --dataset=trash/dataset --weights=coco
   ```

## Structure

- `mrcnn/`: Mask R-CNN implementation
- `trash/`: Trash detection specific code
- `images/`: Directory for test images
- `weights/`: Model weights
- `Detect_trash_on_images.ipynb`: Jupyter notebook for trash detection

## Credits

- Original Mask R-CNN implementation by [Matterport](https://github.com/matterport/Mask_RCNN)
- Trash detection adaptation by SIFR.AI
- TensorFlow 2.x updates and modernization by [Your Name]

More detailed information about the project:  http://opendata.letsdoitworld.org/#/ai

## Disclaimer
The model is meant to be used on google street view images and is taught to detect trash piles. If the model detects trash on any images, that do not include trash, then it means that it has not seen a similar object before in training dataset.

There are a lot of improvements to be made and a lot of new training images to be added to the project. 
Our intent is not to offend anyone or anything. 

## Data
We have added the original dataset with some changes in the trash/dataset folder. It includes all the annotation json files (There are many, since they were done in different times and by different people). 

Additionally there is a link to the images that were done by the LDIW volunteers during the cleanup days, so You are able to select and use the images yourself aswell here: https://drive.google.com/file/d/1X_ozEv5vF3bhg3FIIU6_5suBC7UdVVtA/view These images do not have annotations. 

## Getting Started

To try and test our model on your trash images:
1. Download the latest h5 files from here: https://drive.google.com/drive/folders/1-ii6dHK3mUSY1mKfdYPPNZ18S7fEkl_o?usp=sharing
2. Put the files into "weights" folder. 
3. Python environment requirements are described in requirements.txt
4. Make sure you can use Jupyter Notebooks

## Running the code

### Viewing the results of current weights
Open the notebook: Detect_trash_on_images.ipynb
If all the environment preferences match, you should be able to run the notebook. 

### Training your own trash detection model
Training of a image classificator is described here: https://github.com/matterport/Mask_RCNN

For image annotation we used VGG Image Annotator: http://www.robots.ox.ac.uk/~vgg/software/via/
Trash.py file is modified to understand the project-save- json files that come from VIA.

For training please add also coco weights from the drive folder to the weights folder.

