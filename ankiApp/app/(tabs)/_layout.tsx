import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import {Link, Tabs} from 'expo-router'
import Colors from '@/constants/Colors'
import {Ionicons} from '@expo/vector-icons'

const Layout = () => {
  return (
    <Tabs 
        screenOptions={{
            headerStyle:{
                backgroundColor:Colors.primary
            },
                headerTintColor:'#fff',
                tabBarActiveTintColor: Colors.primary
            }}
    >
        <Tabs.Screen name='sets' options={{
            title:'My Sets',
            tabBarIcon: ({size,color}) => <Ionicons name='home-outline' size={size} color={color}/>,
            headerRight: ()=>(
                <Link href="/" asChild>
                    <TouchableOpacity style={{marginRight:10}} >
                        <Ionicons name='add-outline' size={26} color={'#fff'}/>
                    </TouchableOpacity>
                </Link>
            )
        }}/>
        <Tabs.Screen name='search' options={{
            title:'Search',
            tabBarIcon: ({size,color}) => <Ionicons name='search-outline' size={size} color={color}/>,

        }}/>
        <Tabs.Screen name='profile' options={{
            title:'Profile',
            tabBarIcon: ({size,color}) => <Ionicons name='person-outline' size={size} color={color}/>,

        }}/>
    </Tabs>
  )
}

export default Layout