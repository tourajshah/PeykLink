import { COLORS } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Entypo from '@expo/vector-icons/Entypo';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
        screenOptions={{
            tabBarShowLabel: false,
            headerShown : false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.grey,
            tabBarStyle: {
                borderTopWidth: 0,
                position: "absolute",
                elevation: 0,
                height: 40,
                paddingBottom: 8,
            }
        }}
    >
        <Tabs.Screen 
            name='index'
            options={{
                tabBarIcon: ({size,color}) => <Ionicons name="home" size={size} color={color} />
            }}
        />
        <Tabs.Screen 
            name='explore'
            options={{
                tabBarIcon: ({size,color}) => <Entypo name="shop" size={size} color={color} />
            }}
        />
        <Tabs.Screen 
            name='create'
            options={{
                tabBarIcon: ({size,color}) => <Ionicons name="add-circle" size={size} color={color} />
            }}
        />
        <Tabs.Screen 
            name='inbox'
            options={{
                tabBarIcon: ({size,color}) => <MaterialCommunityIcons name="message-reply-text" size={size} color={color} />
            }}
        />
        <Tabs.Screen 
            name='profile'
            options={{
                tabBarIcon: ({size,color}) => <Ionicons name="person-circle" size={size} color={color} />
            }}
        />
    </Tabs>
  )
}