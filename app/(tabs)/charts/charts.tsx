import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ContributionGraph,
} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// Interfaces para tipagem
interface AnimalTypeData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface DailyRescueData {
  data: number[];
}

interface MonthlyData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

interface StatCardProps {
  value: number;
  label: string;
  color: string;
}


const animalTypeData: AnimalTypeData[] = [
  {
    name: 'Cães',
    population: 45,
    color: '#8884d8',
    legendFontColor: '#333',
    legendFontSize: 14,
  },
  {
    name: 'Gatos',
    population: 32,
    color: '#82ca9d',
    legendFontColor: '#333',
    legendFontSize: 14,
  },
  {
    name: 'Aves',
    population: 18,
    color: '#ffc658',
    legendFontColor: '#333',
    legendFontSize: 14,
  },
  {
    name: 'Outros',
    population: 12,
    color: '#ff7c7c',
    legendFontColor: '#333',
    legendFontSize: 14,
  },
];

const dailyRescueData: DailyRescueData = {
  data: [8, 12, 6, 15, 9, 18, 14],
};

const monthlyData: MonthlyData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  datasets: [
    {
      data: [234, 189, 267, 298, 245, 287],
      color: (opacity = 1) => `rgba(130, 202, 157, ${opacity})`,
      strokeWidth: 3,
    },
  ],
};

// Configuração dos gráficos
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(136, 132, 216, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#82ca9d',
  },
};

// Componente para Card de Estatística
const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Componente principal
const AnimalChartsTab: React.FC = () => {
  // Cálculos com tipagem
  const totalAnimals: number = animalTypeData.reduce(
    (sum: number, item: AnimalTypeData) => sum + item.population,
    0
  );
  const weeklyTotal: number = dailyRescueData.data.reduce(
    (sum: number, value: number) => sum + value,
    0
  );
  const averageDaily: number = Number((weeklyTotal / 7).toFixed(1));
  const currentMonth: number = monthlyData.datasets[0].data[monthlyData.datasets[0].data.length - 1];

  // Encontrar estatísticas
  const maxDailyRescues: number = Math.max(...dailyRescueData.data);
  const dayNames: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const bestDayIndex: number = dailyRescueData.data.indexOf(maxDailyRescues);
  const bestDay: string = dayNames[bestDayIndex];

  const mostRescuedType: AnimalTypeData = animalTypeData.reduce(
    (prev: AnimalTypeData, current: AnimalTypeData) =>
      prev.population > current.population ? prev : current
  );

  const maxMonthlyRescues: number = Math.max(...monthlyData.datasets[0].data);
  const bestMonthIndex: number = monthlyData.datasets[0].data.indexOf(maxMonthlyRescues);
  const bestMonth: string = monthlyData.labels[bestMonthIndex];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Relatório de Animais Resgatados</Text>

      {/* Cards de Estatísticas */}
      <View style={styles.statsContainer}>
        <StatCard value={totalAnimals} label="Total Resgatados" color="#8884d8" />
        <StatCard value={weeklyTotal} label="Esta Semana" color="#82ca9d" />
        <StatCard value={currentMonth} label="Este Mês" color="#ffc658" />
      </View>

      {/* Gráfico de Pizza - Tipos de Animais */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Tipos de Animais Resgatados</Text>
        <PieChart
          data={animalTypeData}
          width={screenWidth - 60}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          absolute
        />
      </View>

      {/* Gráfico de Barras - Resgates por Dia */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Resgates por Dia da Semana</Text>
        <BarChart
          data={{
            labels: dayNames,
            datasets: [dailyRescueData],
          }}
          width={screenWidth - 60}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
          showBarTops={false}
          fromZero
        />
      </View>

      {/* Gráfico de Linha - Evolução Mensal */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolução Mensal de Resgates</Text>
        <LineChart
          data={monthlyData}
          width={screenWidth - 60}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix=""
          yAxisInterval={1}
        />
      </View>

      {/* Resumo Final */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Resumo do Período</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}></Text>
          <Text style={styles.summaryText}>
            Maior número de resgates: {bestDay} ({maxDailyRescues} animais)
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}></Text>
          <Text style={styles.summaryText}>
            Tipo mais resgatado: {mostRescuedType.name} ({mostRescuedType.population} animais)
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}></Text>
          <Text style={styles.summaryText}>
            Melhor mês: {bestMonth} ({maxMonthlyRescues} resgates)
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}></Text>
          <Text style={styles.summaryText}>Média diária: {averageDaily} animais</Text>
        </View>
      </View>

      {/* Cards de Destaque */}
      <View style={styles.highlightContainer}>
        <View style={[styles.highlightCard, styles.blueGradient]}>
          <Text style={styles.highlightIcon}></Text>
          <Text style={styles.highlightTitle}>Taxa de Recuperação</Text>
          <Text style={styles.highlightValue}>94%</Text>
          <Text style={styles.highlightSubtitle}>dos animais resgatados</Text>
        </View>
        <View style={[styles.highlightCard, styles.greenGradient]}>
          <Text style={styles.highlightIcon}></Text>
          <Text style={styles.highlightTitle}>Adoções</Text>
          <Text style={styles.highlightValue}>78</Text>
          <Text style={styles.highlightSubtitle}>neste mês</Text>
        </View>
      </View>

      {/* Espaçamento final */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  highlightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  highlightCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blueGradient: {
    backgroundColor: '#4f46e5',
  },
  greenGradient: {
    backgroundColor: '#059669',
  },
  highlightIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  highlightSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default AnimalChartsTab;