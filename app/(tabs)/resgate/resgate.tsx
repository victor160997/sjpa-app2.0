import { useState, useEffect, useRef } from "react";
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
import { ResgateContainer } from "./index.styles";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Ionicons, Entypo } from "@expo/vector-icons";
import { Image } from "react-native";
import {TouchableOpacity } from "react-native";

interface ResgateDTO {
  description: string;
  date: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photoUri?: string; // Added to store photo URI
}

const schema = yup.object().shape({
  description: yup.string().required("Descrição é obrigatória"),
  date: yup.date().required("Data é obrigatória"),
  location: yup.object().shape({
    latitude: yup.number().required("Latitude é obrigatória"),
    longitude: yup.number().required("Longitude é obrigatória"),
  }),
  photoUri: yup.string().optional(),
});

export default function ResgateScreen() {
  const [resgates, setResgates] = useState<ResgateDTO[]>([]);
  const [visibleDialog, setVisibleDialog] = useState(false);
  const [visibleDatePicker, setVisibleDatePicker] = useState(false);
  const [visibleMap, setVisibleMap] = useState(false);
  const [visibleCamera, setVisibleCamera] = useState(false); // State for camera view
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      description: "",
      date: new Date(),
      location: {
        latitude: 0,
        longitude: 0,
      },
      photoUri: "",
    },
  });

  // Request permissions for location and media library
  useEffect(() => {
    (async () => {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        alert("Permissão para acessar a localização foi negada.");
      }

      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para salvar as fotos.");
      }
    })();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    const location = await Location.getCurrentPositionAsync({});
    setCurrentLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    setValue("location", {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    setVisibleDialog(true);
  };

  // Camera permission check
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ textAlign: "center", paddingBottom: 10, fontSize: 16 }}>
          Precisamos da sua permissão para acessar a câmera
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Conceder Permissão
        </Button>
      </View>
    );
  }

  // Take photo
  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      setValue("photoUri", photo.uri);
      setVisibleCamera(false);
      Alert.alert("Sucesso", "Foto salva na galeria!");
    }
  };

  const showDialog = () => setVisibleDialog(true);

  const hideDialog = () => {
    setVisibleDialog(false);
    reset();
  };

  const onSubmit = (data: ResgateDTO) => {
    setResgates([...resgates, { ...data, address }]);
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
          <ResgateContainer key={index}>
            <Text>Data: {r.date.toLocaleDateString()}</Text>
            <Text>Descrição: {r.description}</Text>
            <Text>
              Localização: {r.location.latitude}, {r.location.longitude}
            </Text>
            {r.location.address && <Text>Endereço: {r.location.address}</Text>}
            {r.photoUri && (
              <Image
                source={{ uri: r.photoUri }}
                style={{ width: 100, height: 100, marginTop: 10 }}
              />
            )}
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
          </ResgateContainer>
        ))}
      </S.ViewScrollView>

      {/* Form Dialog */}
      {visibleDialog && !visibleCamera && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleDialog} onDismiss={hideDialog}>
            <Dialog.Title>Resgate</Dialog.Title>
            <Dialog.Content>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      label="Descrição"
                      mode="outlined"
                      onBlur={onBlur}
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
                    <Button
                      mode="outlined"
                      onPress={() => setVisibleDatePicker(true)}
                      style={{ marginTop: 10 }}
                    >
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
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
                style={{ marginTop: 10 }}
              >
                Usar Localização Atual
              </Button>
              <TextInput
                label="Endereço Manual"
                mode="outlined"
                value={address}
                onChangeText={setAddress}
                style={{ marginTop: 10 }}
              />
              <Button
                mode="outlined"
                onPress={() => setVisibleCamera(true)}
                style={{ marginTop: 10 }}
              >
                Tirar Foto do Animal
              </Button>
              {control._formValues.photoUri && (
                <Image
                  source={{ uri: control._formValues.photoUri }}
                  style={{ width: 100, height: 100, marginTop: 10 }}
                />
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={hideDialog}>CANCELAR</Button>
              <Button onPress={handleSubmit(onSubmit)}>CONFIRMAR</Button>
            </Dialog.Actions>
          </S.ViewShowDialog>
        </S.CenteredView>
      )}

      {/* Camera View */}
      {visibleCamera && (
        <S.CenteredView>
          <CameraView
            ref={cameraRef}
            style={{ width: "100%", height: 400 }}
            facing="back"
            mode="picture"
          >
            <View
              style={{
                position: "absolute",
                bottom: 30,
                width: "100%",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#00000080",
                  padding: 15,
                  borderRadius: 50,
                }}
                onPress={takePhoto}
              >
                <Entypo name="camera" size={30} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#00000080",
                  padding: 15,
                  borderRadius: 50,
                  marginLeft: 20,
                }}
                onPress={() => setVisibleCamera(false)}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
            </View>
          </CameraView>
        </S.CenteredView>
      )}

      {/* Map View */}
      {visibleMap && currentLocation && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleMap} onDismiss={() => setVisibleMap(false)}>
            <Dialog.Title>Localização do Resgate</Dialog.Title>
            <Dialog.Content>
              <MapView
                style={{ width: "100%", height: 300 }}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="Local do Resgate"
                  description="Animal a ser resgatado"
                >
                  <Icon name="paw" size={24} color="red" />
                </Marker>
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