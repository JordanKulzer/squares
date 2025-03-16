import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import RNPickerSelect from 'react-native-picker-select';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  createNewSquare: (inputTitle: string, inputSquareAmount: number) => void;
}

const evenNumbers = [
  { label: '1 x 1', value: 1 },
  { label: '2 x 2', value: 2 },
  { label: '3 x 3', value: 3 },
  { label: '4 x 4', value: 4 },
  { label: '5 x 5', value: 5 },
  { label: '6 x 6', value: 6 },
  { label: '7 x 7', value: 7 },
  { label: '8 x 8', value: 8 },
  { label: '9 x 9', value: 9 },
  { label: '10 x 10', value: 10 }
];

const data = [
  { label: 'Yes', value: true },
  { label: 'no', value: false },
]

const NewModalSquare: React.FC<ModalProps> = ({ visible, onClose, createNewSquare }) => {
  const [inputTitle, setInputTitle] = useState('');
  const [inputSquareAmount, setInputSquareAmount] = useState(null);
  const [evenNumber, setEvenNumber] = useState(null);
  const [isFocus, setIsFocus] = useState(false);
  const [isSelected, setSelection] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [gridSize, setGridSize] = useState('3x3');

  const gridSizes = [
    { label: '3x3', value: '3x3' },
    { label: '4x4', value: '4x4' },
    { label: '5x5', value: '5x5' },
    { label: '6x6', value: '6x6' },
  ];
  
  // setEvenNumber(null);
  // Handle redirect with the values from the inputs
  const handleRedirect = () => {
    console.log("title: ", inputTitle);
    console.log("evenNumber: ", evenNumber);
    createNewSquare(inputTitle, evenNumber); // Pass the values back to the parent
    onClose(); // Close the modal
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Welcome to your new Square!</Text>
          <TextInput
            style={styles.textInput}
            onChangeText={setInputTitle}
            value={inputTitle}
            placeholder='Enter the name of your new Square'
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.textInput}
            onChangeText={setInputTitle}
            value={inputTitle}
            placeholder='Enter your username'
            placeholderTextColor="grey"
          />
          <TextInput
            style={styles.textInput}
            keyboardType='numeric'
            onChangeText={setInputTitle}
            value={inputTitle}
            placeholder='Enter number of players'
            placeholderTextColor="grey"
          />
          <View style={[{flexDirection: 'row', justifyContent: 'space-between'}]}>
            <Text>Enter teams:</Text>
            <View style={[{flexDirection: 'column', justifyContent: 'center'}]}>
              <TextInput
                style={styles.textInput}
                keyboardType='numeric'
                onChangeText={setInputTitle}
                value={inputTitle}
                placeholder='Team 1'
                placeholderTextColor="grey"
              />
              <TextInput
                style={styles.textInput}
                keyboardType='numeric'
                onChangeText={setInputTitle}
                value={inputTitle}
                placeholder='Team 2'
                placeholderTextColor="grey"
              />
            </View>
          </View>
          {/* <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
            data={evenNumbers} 
            onChange={item => {
              setEvenNumber(item.value);
              setIsFocus(false);
            }} 
            labelField={'label'}
            valueField={'value'} 
            value={evenNumber}
            placeholder={evenNumber ? `Selected: ${evenNumber}` : 'What is the size of your grid?'}
          /> */}
          <RNPickerSelect
            onValueChange={(value) => setGridSize(value)}
            items={gridSizes}
            style={pickerSelectStyles}
            value={gridSize}
          />
          <Text style={styles.selected}>Selected Grid Size: {gridSize}</Text>

          <Dropdown
            style={styles.dropdown}
            data={data}
            labelField="label"
            valueField="value"
            value={selectedValue}
            onChange={item => {
              setSelectedValue(item.value);
              setIsFocus(false);
            }} 
            placeholder={selectedValue ? `Selected: ${selectedValue}` : 'Randomize Grid?'}
          />
          <View style={styles.buttonsContainer}>
              <TouchableOpacity onPress={handleRedirect} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
    </Modal>
  );
};

export default NewModalSquare

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    color: 'black',
    backgroundColor: 'white',
    paddingRight: 30, // To add space for the dropdown icon
  },
  inputAndroid: {
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    color: 'black',
    backgroundColor: 'white',
    paddingRight: 30, // To add space for the dropdown icon
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  selected: {
    marginTop: 20,
    fontSize: 16,
  },
  dropdown: {
    height: 50,
    width: 200,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 5,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  textInput: {
    height: 40,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 20,

  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  picker: {
    width: '100%',
    height: 50,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

