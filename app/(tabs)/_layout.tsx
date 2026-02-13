import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics"; // NEW: For Native Feel
import { Tabs } from "expo-router"; // Added hooks for logic
import React from "react";
import { Platform, View } from "react-native";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// 1. IMPORT PALETTE
const PALETTE = {
  surface: "#FFFFFF",
  primary: "#000000",
  textSecondary: "#6B7280",
  glassBorder: "rgba(255, 255, 255, 0.3)",
};

export default function TabLayout() {
  // Initialize Translation
  const { t } = useTranslation();

  return (
    // <NativeTabs
    //     // screenOptions={{
    //     //     tabBarShowLabel: false,
    //     //     headerShown : false,
    //     //     tabBarActiveTintColor: COLORS.primary,
    //     //     tabBarInactiveTintColor: COLORS.grey,
    //     //     tabBarStyle: {
    //     //         borderTopWidth: 0,
    //     //         position: "absolute",
    //     //         elevation: 0,
    //     //         height: 40,
    //     //         paddingBottom: 8,
    //     //     }
    //     // }}
    // >
    //     <NativeTabs.Trigger name='index'>
    //         <Label>Home</Label>
    //         <Icon sf={"homepod.fill"}/>
    //     </NativeTabs.Trigger>
    //     <NativeTabs.Trigger name='explore'>
    //         <Label>Explore</Label>
    //         <Icon sf={"homepod.fill"}/>
    //     </NativeTabs.Trigger>
    //     <NativeTabs.Trigger name='create'>
    //         <Label>Create</Label>
    //         <Icon sf={"homepod.fill"}/>
    //     </NativeTabs.Trigger>
    //     <NativeTabs.Trigger name='inbox'>
    //         <Label>Inbox</Label>
    //         <Icon sf={"homepod.fill"}/>
    //     </NativeTabs.Trigger>
    //     <NativeTabs.Trigger name='profile'>
    //         <Label>Profile</Label>
    //         <Icon sf={"homepod.fill"}/>
    //     </NativeTabs.Trigger>
    //     {/* <Tabs.Screen
    //         name='index'
    //         options={{
    //             tabBarIcon: ({size,color}) => <Ionicons name="home" size={size} color={color} />
    //         }}
    //     />
    //     <Tabs.Screen
    //         name='explore'
    //         options={{
    //             tabBarIcon: ({size,color}) => <Entypo name="shop" size={size} color={color} />
    //         }}
    //     />
    //     <Tabs.Screen
    //         name='create'
    //         options={{
    //             tabBarIcon: ({size,color}) => <Ionicons name="add-circle" size={size} color={color} />
    //         }}
    //     />
    //     <Tabs.Screen
    //         name='inbox'
    //         options={{
    //             tabBarIcon: ({size,color}) => <MaterialCommunityIcons name="message-reply-text" size={size} color={color} />
    //         }}
    //     />
    //     <Tabs.Screen
    //         name='profile'
    //         options={{
    //             tabBarIcon: ({size,color}) => <Ionicons name="person-circle" size={size} color={color} />
    //         }}
    //     /> */}
    // </NativeTabs>

    /* --- NEW MODERN JS TABS IMPLEMENTATION --- */
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: PALETTE.primary,
        tabBarInactiveTintColor: PALETTE.textSecondary,
        // 2. FEATURE: Hide tabs when keyboard opens (Android Standard)
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: "rgba(255, 255, 255, 0.92)", // Glass effect
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: Platform.OS === "ios" ? 85 : 55,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("layout.tabs.home"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
        // 3. FEATURE: HAPTIC FEEDBACK ON PRESS
        listeners={{
          tabPress: (e) => {
            // Triggers light haptic impact when tab is pressed
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("layout.tabs.explore"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={26}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t("layout.tabs.create"),
          tabBarLabelStyle: { fontWeight: "700" },
          tabBarIcon: ({ focused }) => (
            <View style={{ marginTop: -4 }}>
              <Ionicons
                name={focused ? "add-circle" : "add-circle-outline"}
                size={32}
                color={PALETTE.primary}
              />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(), // Slightly different feel for Create
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t("layout.tabs.inbox"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={
                focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
              }
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("layout.tabs.profile"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
    </Tabs>
  );
}
