import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const NewSquareScreen = ({ route }: { route: { params: { inputTitle: string, inputSquareAmount: null} } }) => {
  const { inputTitle, inputSquareAmount } = route.params;
  // Initial 10x10 grid coordinates, will contain coordinates of selected squares
  const [selectedSquares, setSelectedSquares] = useState([]);

  const squareAmount = inputSquareAmount;

  // Function to handle press on a grid square
  const handlePress = (x, y) => {
    const newSquare = `${x},${y}`;
    // Check if the square is already selected
    if (selectedSquares.includes(newSquare)) {
      // If yes, remove it from the array
      setSelectedSquares(selectedSquares.filter(item => item !== newSquare));
    } else {
      // If no, add it to the array
      <Text style={styles.squareText}>{inputTitle}</Text>
      setSelectedSquares([...selectedSquares, newSquare]);
      <Text style={styles.squareText}>{inputTitle}</Text>
    }
    <Text>{inputTitle}</Text>
  };

  // Function to render grid squares
  const renderGrid = () => {
    let grid = [];
    for (let x = 0; x < squareAmount; x++) {
      let row = [];
      for (let y = 0; y < squareAmount; y++) {
        const squareId = `${x},${y}`;
        const isSelected = selectedSquares.includes(squareId);

        row.push(
          <TouchableOpacity
            key={squareId}
            style={[styles.square, isSelected && styles.selectedSquare]}
            onPress={() => handlePress(x, y)}
          />
        );
      }
      grid.push(
        <View key={x} style={styles.row}>
          {row}
        </View>
      );
    }
    return grid;
  };

  return (
    <View style={styles.container}>
      <Text>{inputTitle}</Text>
      <View style={styles.gridContainer}>
        {/* Y-Axis labels */}
        <View style={styles.yAxisContainer}>
          {Array.from({ length: squareAmount }, (_, index) => (
            <Text key={index} style={styles.axisLabel}>
              {index}
            </Text>
          ))}
        </View>

        {/* Grid and X-Axis labels */}
        <View style={styles.gridWithXAxis}>
          {/* X-Axis labels */}
          <View style={styles.xAxisRow}>
            {Array.from({ length: squareAmount }, (_, index) => (
              <Text key={index} style={styles.axisLabel}>
                {index}
              </Text>
            ))}
          </View>

          {/* Scrollable grid */}
          <View style={styles.grid} >
            <View>{renderGrid()}</View>
          </View>
        </View>
      </View>

      <Text style={styles.arrayTitle}>Selected Coordinates:</Text>
      <Text style={styles.selectedArray}>{selectedSquares.join(', ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  squareText: {
    fontSize: 12,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
  },
  yAxisContainer: {
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginRight: 10,
  },
  gridWithXAxis: {
    flexDirection: 'column',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  grid: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: 30,
    height: 30,
    margin: 2,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedSquare: {
    backgroundColor: '#4CAF50',
  },
  axisLabel: {
    fontSize: 12,
    width: 30,
    textAlign: 'center',
    lineHeight: 30, // Center the text vertically
  },
  arrayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  selectedArray: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default NewSquareScreen;
