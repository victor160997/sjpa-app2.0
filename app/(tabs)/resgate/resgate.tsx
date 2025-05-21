import { useState, useEffect, useRef } from "react";
import CommonLayout from "@/components/Layout/CommonLayout";
import { View, Platform, Alert, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import { Button, Dialog, Text, TextInput, Surface, Avatar, IconButton } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as S from "./index.styles";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { DatePickerModal } from "react-native-paper-dates";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { CameraType, CameraView, FlashMode, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Ionicons, Entypo, FontAwesome } from "@expo/vector-icons";
import { Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Constants
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Types
interface ResgateDTO {
  description: string;
  date: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photoUri?: string;
  animalType?: string; // Novo campo para o tipo de animal
}

// Validation schema
const schema = yup.object().shape({
  description: yup.string().required("Descrição é obrigatória"),
  date: yup.date().required("Data é obrigatória"),
  location: yup.object().shape({
    latitude: yup.number().required("Latitude é obrigatória"),
    longitude: yup.number().required("Longitude é obrigatória"),
  }),
  photoUri: yup.string().optional(),
  animalType: yup.string().optional(),
});

// Animal type options
const animalTypes = [
  { icon: "cat", label: "Gato" },
  { icon: "dog", label: "Cachorro" },
  { icon: "owl", label: "Ave" },
  { icon: "turtle", label: "Réptil" },
  { icon: "rabbit", label: "Outro" },
];

export default function ResgateScreen() {
  const [resgates, setResgates] = useState<ResgateDTO[]>([]);
  const [visibleDialog, setVisibleDialog] = useState(false);
  const [visibleDatePicker, setVisibleDatePicker] = useState(false);
  const [visibleMap, setVisibleMap] = useState(false);
  const [visibleCamera, setVisibleCamera] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back")
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [countdown, setCountdown] = useState(0);
  const [selectedAnimalType, setSelectedAnimalType] = useState("");
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  
  const cameraRef = useRef<any>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      description: "",
      date: new Date(),
      location: {
        latitude: 0,
        longitude: 0,
      },
      photoUri: "",
      animalType: "",
    },
  });

  const photoUri = watch("photoUri");
  const formAnimalType = watch("animalType");

 
  useEffect(() => {
    (async () => {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        Alert.alert("Permissão negada", "Permissão para acessar a localização foi negada.");
      }

      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para salvar as fotos.");
      }
    })();
  }, []);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setValue("location", {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Try to get address
      try {
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (addressResponse && addressResponse.length > 0) {
          const addressObj = addressResponse[0];
          const formattedAddress = [
            addressObj.street,
            addressObj.district,
            addressObj.city,
            addressObj.region,
            addressObj.postalCode,
          ]
            .filter(Boolean)
            .join(", ");
          
          setAddress(formattedAddress);
        }
      } catch (error) {
        console.log("Error getting address:", error);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível obter sua localização atual.");
    }
  };

  // Camera permission check
  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={50} color="#757575" style={styles.permissionIcon} />
        <Text style={styles.permissionText}>
          Precisamos da sua permissão para acessar a câmera
        </Text>
        <Button 
          mode="contained" 
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          Conceder Permissão
        </Button>
      </View>
    );
  }

  // Toggle camera type (front/back)
  const toggleCameraType = () => {
    setCameraType(current => (
      current === "back" ? "front" : "back"
    ));
  };

  // Toggle flash mode
  const toggleFlash = () => {
    setFlashMode(current => (current === "off" ? "on" : "off"));
  };

  // Start countdown for photo
  const startCountdown = () => {
    setIsTakingPhoto(true);
    setCountdown(3);
    
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!);
          takePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Take photo
  const takePhoto = async () => {
    setIsTakingPhoto(false);
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        setValue("photoUri", photo.uri);
        setVisibleCamera(false);
        
        // Toast instead of Alert for better UX
        // Alert.alert("Sucesso", "Foto salva na galeria!");
      } catch (error) {
        Alert.alert("Erro", "Não foi possível capturar a foto. Tente novamente.");
      }
    }
  };

  const showDialog = () => {
    getCurrentLocation(); // Auto get location when dialog opens
    setVisibleDialog(true);
  };

  const hideDialog = () => {
    setVisibleDialog(false);
    reset();
    setSelectedAnimalType("");
  };

  const onSubmit = (data: ResgateDTO) => {
    // Add the animal type to the data
    const completeData = {
      ...data,
      address,
      animalType: selectedAnimalType || formAnimalType,
    };
    
    setResgates([...resgates, completeData]);
    hideDialog();
    
    // Show success message
    Alert.alert(
      "Resgate registrado",
      "O resgate foi registrado com sucesso!",
      [{ text: "OK" }]
    );
  };

  const onDateChange = (date: Date | undefined) => {
    if (date) {
      setValue("date", date);
      setVisibleDatePicker(false);
    }
  };

  const handleSelectAnimalType = (type: string) => {
    setSelectedAnimalType(type);
    setValue("animalType", type);
  };

  return (
    
    
    <CommonLayout>
      <S.ViewScrollView contentContainerStyle={styles.scrollViewContent}>
        <Surface style={styles.header}>
          <Text style={styles.headerTitle}>Resgates de Animais</Text>
          <Text style={styles.headerSubtitle}>Registre e acompanhe resgates de animais em situação de risco</Text>
        </Surface>
        
        <Button
          mode="contained"
          icon="plus"
          onPress={showDialog}
          style={styles.registerButton}
          contentStyle={styles.registerButtonContent}
          labelStyle={styles.registerButtonLabel}
        >
          Registrar Novo Resgate
        </Button>

        {resgates.length === 0 ? (
          <Surface style={styles.emptyState}>
            <Icon name="paw" size={50} color="#BBBBBB" />
            <Text style={styles.emptyStateText}>Nenhum resgate registrado</Text>
            <Text style={styles.emptyStateSubtext}>
              Registre o primeiro resgate de animal clicando no botão acima
            </Text>
          </Surface>
        ) : (
          resgates.map((r, index) => (
            <Surface key={index} style={styles.rescueCard}>
              <View style={styles.rescueCardHeader}>
                <View style={styles.rescueCardHeaderLeft}>
                  <Avatar.Icon 
                    size={40} 
                    icon={r.animalType ? r.animalType : "paw"} 
                    style={styles.animalTypeIcon} 
                  />
                  <View>
                    <Text style={styles.rescueCardDate}>
                      {r.date.toLocaleDateString()}
                    </Text>
                    <Text style={styles.rescueCardTypeLabel}>
                      {animalTypes.find(t => t.icon === r.animalType)?.label || "Animal"}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon="map-marker"
                  size={24}
                  onPress={() => {
                    setCurrentLocation({
                      latitude: r.location.latitude,
                      longitude: r.location.longitude,
                    });
                    setVisibleMap(true);
                  }}
                />
              </View>
              
              <Text style={styles.rescueCardDescription}>{r.description}</Text>
              
              {r.location.address && (
                <View style={styles.addressContainer}>
                  <Icon name="map-marker-outline" size={16} style={styles.addressIcon} />
                  <Text style={styles.addressText}>{r.location.address}</Text>
                </View>
              )}
              
              {r.photoUri && (
                <Image
                  source={{ uri: r.photoUri }}
                  style={styles.rescueCardImage}
                  resizeMode="cover"
                />
              )}
            </Surface>
          ))
        )}
      </S.ViewScrollView>

      {/* Form Dialog */}
      {visibleDialog && !visibleCamera && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleDialog} onDismiss={hideDialog}>
            <Dialog.Title style={styles.dialogTitle}>Registrar Resgate</Dialog.Title>
            <S.DialogScrollContent style={styles.dialogScrollArea}>
              <View style={styles.animalTypeSelector}>
                <Text style={styles.sectionTitle}>Tipo de Animal</Text>
               <View style={styles.animalTypeButtons}>
                  {animalTypes.map((type) => (
                    <TouchableOpacity
                      key={type.icon}
                      style={[
                        styles.animalTypeButton,
                        selectedAnimalType === type.icon && styles.animalTypeButtonSelected,
                      ]}
                      onPress={() => handleSelectAnimalType(type.icon)}
                    >
                      <Icon
                        name={type.icon}
                        size={24}
                        color={selectedAnimalType === type.icon ? "#FFFFFF" : "#000000"}
                      />
                      <Text
                        style={[
                          styles.animalTypeLabel,
                          selectedAnimalType === type.icon && styles.animalTypeLabelSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Detalhes do Resgate</Text>
              
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Descrição da situação"
                      mode="outlined"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!error}
                      multiline
                      numberOfLines={3}
                      style={styles.inputField}
                    />
                    {error && <Text style={styles.errorText}>{error.message}</Text>}
                  </View>
                )}
              />
              
              <View style={styles.sectionRow}>
                <View style={styles.sectionColumn}>
                  <Text style={styles.inputLabel}>Data do Resgate</Text>
                  <Controller
                    control={control}
                    name="date"
                    render={({ field: { value }, fieldState: { error } }) => (
                      <View style={styles.inputContainer}>
                        <Button
                          mode="outlined"
                          icon="calendar"
                          onPress={() => setVisibleDatePicker(true)}
                          style={styles.dateButton}
                          contentStyle={styles.dateButtonContent}
                        >
                          {value.toLocaleDateString()}
                        </Button>
                        {error && <Text style={styles.errorText}>{error.message}</Text>}
                      </View>
                    )}
                  />
                </View>
              </View>
              
              <DatePickerModal
                locale="pt"
                mode="single"
                visible={visibleDatePicker}
                onDismiss={() => setVisibleDatePicker(false)}
                date={control._formValues.date}
                onConfirm={({ date }) => onDateChange(date)}
              />
              
              <Text style={styles.inputLabel}>Localização</Text>
              <View style={styles.locationContainer}>
                <View style={styles.locationPreview}>
                  {currentLocation ? (
                    <View style={styles.locationInfoBox}>
                      <Icon name="map-marker-check" size={20} color="#4CAF50" />
                      <Text style={styles.locationStatusText}>Localização definida</Text>
                    </View>
                  ) : (
                    <View style={styles.locationInfoBox}>
                      <Icon name="map-marker-off" size={20} color="#F44336" />
                      <Text style={styles.locationStatusText}>Localização pendente</Text>
                    </View>
                  )}
                </View>
                <Button
                  mode="outlined"
                  icon="crosshairs-gps"
                  onPress={getCurrentLocation}
                  style={styles.locationButton}
                >
                  {currentLocation ? "Atualizar localização" : "Usar localização atual"}
                </Button>
              </View>
              
              <TextInput
                label="Endereço manual (opcional)"
                mode="outlined"
                value={address}
                onChangeText={setAddress}
                style={[styles.inputField, styles.addressInput]}
              />
              
              <Text style={styles.sectionTitle}>Fotografia</Text>
              {photoUri ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.photoActionButtons}>
                    <Button
                      mode="contained"
                      icon="camera"
                      onPress={() => setVisibleCamera(true)}
                      style={styles.recaptureButton}
                    >
                      Nova foto
                    </Button>
                    <Button
                      mode="outlined"
                      icon="delete"
                      onPress={() => setValue("photoUri", "")}
                      style={styles.removePhotoButton}
                    >
                      Remover
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  mode="contained"
                  icon="camera-plus"
                  onPress={() => setVisibleCamera(true)}
                  style={styles.cameraButton}
                >
                  Tirar foto do animal
                </Button>
              )}
            </S.DialogScrollContent>
            <Dialog.Actions style={styles.dialogActions}>
              <Button onPress={hideDialog} textColor="#757575">
                CANCELAR
              </Button>
              <Button mode="contained" onPress={handleSubmit(onSubmit)}>
                REGISTRAR
              </Button>
            </Dialog.Actions>
          </S.ViewShowDialog>
        </S.CenteredView>
      )}

      {/* Camera View */}
      {visibleCamera && (
        <View style={styles.cameraContainer}>
          <StatusBar style="light" />
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            flash={flashMode}
            mode="picture"
          >
            {isTakingPhoto && countdown > 0 && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
            
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.cameraCloseButton}
                  onPress={() => setVisibleCamera(false)}
                >
                  <Icon name="close" size={28} color="white" />
                </TouchableOpacity>
                
                <View style={styles.cameraTitle}>
                  <Text style={styles.cameraTitleText}>Foto do animal</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.cameraToggleButton}
                  onPress={toggleFlash}
                >
                  <Icon
                    name={flashMode === "on" ? "flash" : "flash-off"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.cameraGuideContainer}>
                <View style={styles.cameraGuide}>
                  {selectedAnimalType && (
                    <Icon name={selectedAnimalType} size={40} color="rgba(255,255,255,0.6)" />
                  )}
                </View>
              </View>
              
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraSwitchButton}
                  onPress={toggleCameraType}
                >
                  <Icon name="camera-switch" size={30} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cameraShutterButton}
                  onPress={startCountdown}
                  disabled={isTakingPhoto}
                >
                  <View style={styles.cameraShutterInner} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cameraTimerButton}
                  onPress={() => setVisibleCamera(false)}
                >
                  <Icon name="image" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      )}

      {/* Map View */}
      {visibleMap && currentLocation && (
        <S.CenteredView>
          <S.ViewShowDialog visible={visibleMap} onDismiss={() => setVisibleMap(false)}>
            <Dialog.Title style={styles.mapDialogTitle}>
              <Icon name="map-marker" size={20} color="#1E88E5" style={styles.mapTitleIcon} />
              <Text>Localização do Resgate</Text>
            </Dialog.Title>
            <Dialog.Content style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
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
                  <View style={styles.customMarker}>
                    <Icon name="paw" size={18} color="white" />
                  </View>
                </Marker>
              </MapView>
              
              {address && (
                <View style={styles.mapAddressContainer}>
                  <Icon name="map-marker-outline" size={16} color="#757575" />
                  <Text style={styles.mapAddressText}>{address}</Text>
                </View>
              )}
              
              <View style={styles.mapCoordinatesContainer}>
                <Text style={styles.mapCoordinatesText}>
                  Lat: {currentLocation.latitude.toFixed(6)} • Lon: {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button 
                mode="contained" 
                onPress={() => setVisibleMap(false)}
                style={styles.mapCloseButton}
              >
                FECHAR
              </Button>
            </Dialog.Actions>
          </S.ViewShowDialog>
        </S.CenteredView>
      )}
    </CommonLayout>

    
  );
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#757575",
  },
  registerButton: {
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  registerButtonContent: {
    height: 48,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },
  rescueCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    backgroundColor: "#ffffff",
  },
  rescueCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  rescueCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  animalTypeIcon: {
    marginRight: 12,
    backgroundColor: "#E0F2F1",
  },
  rescueCardDate: {
    fontSize: 14,
    fontWeight: "bold",
  },
  rescueCardTypeLabel: {
    fontSize: 12,
    color: "#757575",
  },
  rescueCardDescription: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 16,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  addressIcon: {
    marginRight: 4,
    color: "#757575",
  },
  addressText: {
    fontSize: 14,
    color: "#757575",
    flex: 1,
  },
  rescueCardImage: {
    width: "100%",
    height: 200,
  },
  dialogTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  animalTypeSelector: {
    marginBottom: 8,
  },
  animalTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  animalTypeButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 4,
    marginBottom: 8,
    width: "18%",
  },
  animalTypeButtonSelected: {
    backgroundColor: "#1E88E5",
  },
  animalTypeLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  animalTypeLabelSelected: {
    color: "#FFFFFF",
  },
  inputContainer: {
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  inputField: {
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
  },
  sectionColumn: {
    flex: 1,
  },
  dateButton: {
    height: 48,
    justifyContent: "center",
  },
  dateButtonContent: {
    height: 48,
  },
  locationContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  locationPreview: {
    marginBottom: 8,
  },
  locationInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationButton: {
    marginBottom: 8,
  },
  addressInput: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  photoPreviewContainer: {
    marginHorizontal: 24,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  photoActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  recaptureButton: {
    flex: 1,
    marginRight: 8,
  },
  removePhotoButton: {
    flex: 1,
    marginLeft: 8,
  },
  cameraButton: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#1E88E5",
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  permissionIcon: {
    marginBottom: 16,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: 24,
    fontSize: 16,
  },
  permissionButton: {
    width: "80%",
  },
  // Camera styles
  cameraContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 999,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  cameraCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTitle: {
    alignItems: "center",
  },
  cameraTitleText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cameraToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraGuideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraGuide: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  cameraSwitchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraShutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  cameraTimerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 10,
  },
  countdownText: {
    fontSize: 100,
    fontWeight: "bold",
    color: "white",
  },
  mapDialogTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapTitleIcon: {
    marginRight: 8,
  },
  mapContainer: {
    padding: 0,
  },
  map: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E91E63",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  mapAddressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  mapAddressText: {
    fontSize: 14,
    marginLeft: 4,
    color: "#424242",
    flex: 1,
  },
  mapCoordinatesContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  mapCoordinatesText: {
    fontSize: 12,
    color: "#757575",
  },
  mapCloseButton: {
    marginTop: 8,
  }
});