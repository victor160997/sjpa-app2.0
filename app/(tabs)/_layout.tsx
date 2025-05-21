import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, Tabs } from "expo-router";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { Button, Icon, IconButton, Text } from "react-native-paper";
import CommonMenu from "@/components/Menu";
import { View } from "react-native";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5FC2BF",
        tabBarInactiveTintColor: "#b0bec5",
        tabBarLabelStyle: { fontSize: 14 },
        tabBarStyle: {
          height: 70,
          padding: 10,
        },
      }}
      initialRouteName="cadastro/cadastro"
    >
      <Tabs.Screen
        name="cadastro/cadastro"
        options={{
          title: "Setores",
          headerRight: () => (
            <IconButton
              icon="plus"
              onPress={() => {
                router.push(`/sector/create/`);
              }}
            />
          ),
          tabBarAccessibilityLabel: "sdasdasdsd",
          tabBarLabel: "Animais",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="archive" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conference/conference"
        options={{
          tabBarItemStyle: { alignContent: "space-around" },
          title: "Checagem",
          tabBarIcon: ({ color }) => <TabBarIcon name="check" color={color} />,
        }}
      />
      <Tabs.Screen
        name="resgate/resgate"
        options={{
          tabBarItemStyle: { alignContent: "space-around" },
          title: "Resgate",
          tabBarIcon: ({ color }) => <TabBarIcon name="support" color={color} />,
        }}
      />
    </Tabs>
  );
}
