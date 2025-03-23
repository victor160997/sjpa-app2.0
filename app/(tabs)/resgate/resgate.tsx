import { useState, useEffect } from "react";
import CommonLayout from "@/components/Layout/CommonLayout";
import { View, Platform, Alert } from "react-native";
import { Button, Dialog, Text, TextInput } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as S from "./index.styles";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { DatePickerModal } from "react-native-paper-dates";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";

interface ResgateDTO {
  description: string;
  date: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string; 
  };
}

const schema = yup.object().shape({
  description: yup.string().required("Descrição é obrigatória"),
  date: yup.date().required("Data é obrigatória"),
  location: yup.object().shape({
    latitude: yup.number().required("Latitude é obrigatória"),
    longitude: yup.number().required("Longitude é obrigatória"),
  }),
});

export default function ResgateScreen() {
  const [resgates, setResgates] = useState<ResgateDTO[]>([]);
  const [visibleDialog, setVisibleDialog] = useState(false);
  const [visibleDatePicker, setVisibleDatePicker] = useState(false);
  const [visibleMap, setVisibleMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState("");

  const { control, handleSubmit, reset, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      description: "",
      date: new Date(),
      location: {
        latitude: 0,
        longitude: 0,
      },
    },
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Habilite o acesso à localização para continuar.");
      }
    })();
  }, []);


  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setCurrentLocation({ latitude, longitude });
      setValue("location", { latitude, longitude });

  
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=fbbd341f56b445f0b46dbf4630a0ec50`
      );

      if (response.data.results.length > 0) {
        setAddress(response.data.results[0].formatted);
      } else {
        setAddress("Endereço não encontrado");
      }

      setVisibleDialog(true);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível obter a localização.");
      console.error(error);
    }
  };

  const showDialog = () => setVisibleDialog(true);
  const hideDialog = () => {
    setVisibleDialog(false);
    reset();
  };

  const onSubmit = (data: ResgateDTO) => {
    setResgates([...resgates, data]);
    hideDialog();
  };

  const onDateChange = (date: Date | undefined) => {
    if (date) {
      setValue("date", date);
      setVisibleDatePicker(false);
    }
  };

  return (
    <CommonLayout>
      <S.ViewScrollView>
        <S.ViewButton
          labelStyle={{
            color: "#000000",
            fontSize: 16,
            fontWeight: "bold",
          }}
          icon={() => <Icon name="plus" size={22} />}
          onPress={showDialog}
        >
          Registrar Novo Resgate
        </S.ViewButton>

        {resgates.map((r, index) => (
          <View key={index} style={{ marginBottom: 10 }}>
            <Text>Data: {r.date.toLocaleDateString()}</Text>
            <Text>Descrição: {r.description}</Text>
            <Text>
              Localização: {r.location.latitude}, {r.location.longitude}
            </Text>
            {r.location.address && <Text>Endereço: {r.location.address}</Text>}
            <Button
              mode="outlined"
              onPress={() => {
                setCurrentLocation({
                  latitude: r.location.latitude,
                  longitude: r.location.longitude,
                });
                setVisibleMap(true);
              }}
            >
              Ver no Mapa
            </Button>
          </View>
        ))}
      </S.ViewScrollView>

      {/* Modal do Formulário */}
      {visibleDialog && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleDialog} onDismiss={hideDialog}>
            <Dialog.Title>Resgate</Dialog.Title>
            <Dialog.Content>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      label="Descrição"
                      mode="outlined"
                      onChangeText={onChange}
                      value={value}
                      error={!!error}
                    />
                    {error && <Text style={{ color: "red" }}>{error.message}</Text>}
                  </>
                )}
              />
              <Controller
                control={control}
                name="date"
                render={({ field: { value }, fieldState: { error } }) => (
                  <>
                    <Button mode="outlined" onPress={() => setVisibleDatePicker(true)} style={{ marginTop: 10 }}>
                      {value.toLocaleDateString()}
                    </Button>
                    {error && <Text style={{ color: "red" }}>{error.message}</Text>}
                  </>
                )}
              />
              <DatePickerModal
                locale="pt"
                mode="single"
                visible={visibleDatePicker}
                onDismiss={() => setVisibleDatePicker(false)}
                date={control._formValues.date}
                onConfirm={({ date }) => onDateChange(date)}
              />
              <Button mode="outlined" onPress={getCurrentLocation} style={{ marginTop: 10 }}>
                Usar Localização Atual
              </Button>
              <TextInput
                label="Endereço"
                mode="outlined"
                value={address}
                editable={false}
                style={{ marginTop: 10 }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={hideDialog}>CANCELAR</Button>
              <Button onPress={handleSubmit(onSubmit)}>CONFIRMAR</Button>
            </Dialog.Actions>
          </S.ViewShowDialog>
        </S.CenteredView>
      )}

      {/* Modal de Mapa */}
      {visibleMap && currentLocation && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleMap} onDismiss={() => setVisibleMap(false)}>
            <Dialog.Title>Localização do Resgate</Dialog.Title>
            <Dialog.Content>
              <MapView
                style={{ width: "100%", height: 200, borderRadius: 10 }}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={currentLocation} title="Local do Resgate" />
              </MapView>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setVisibleMap(false)}>FECHAR</Button>
            </Dialog.Actions>
          </S.ViewShowDialog>
        </S.CenteredView>
      )}
    </CommonLayout>
  );
}
