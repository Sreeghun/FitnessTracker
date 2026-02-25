import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity?: number) => string;
  }[];
}

interface Props {
  type: 'line' | 'bar' | 'pie';
  data: ChartData | any;
  title?: string;
  yAxisSuffix?: string;
  height?: number;
}

export default function Chart({ type, data, title, yAxisSuffix = '', height = 220 }: Props) {
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid background lines
      stroke: '#e0e0e0',
      strokeWidth: 1,
    },
  };

  if (Platform.OS === 'web' && type === 'pie') {
    // Fallback for web - simple text display
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.webFallback}>
          {data.map((item: any, index: number) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name}: {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {type === 'line' && (
        <LineChart
          data={data}
          width={screenWidth}
          height={height}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix={yAxisSuffix}
          withInnerLines
          withOuterLines
          withVerticalLines={false}
          withHorizontalLines
          withDots
          withShadow={false}
        />
      )}
      
      {type === 'bar' && (
        <BarChart
          data={data}
          width={screenWidth}
          height={height}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisSuffix={yAxisSuffix}
          withInnerLines
          showValuesOnTopOfBars
          fromZero
        />
      )}
      
      {type === 'pie' && Platform.OS !== 'web' && (
        <PieChart
          data={data}
          width={screenWidth}
          height={height}
          chartConfig={chartConfig}
          accessor="value"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute={false}
          hasLegend
          style={styles.chart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  webFallback: {
    padding: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  legendText: {
    fontSize: 16,
    color: '#333',
  },
});
