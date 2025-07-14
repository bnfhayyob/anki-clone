import { View, Text, StyleSheet, ListRenderItem, TouchableOpacity, RefreshControl, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { Set, getSets } from "@/data/api";
import { defaultStyleSheet } from "@/constants/Styles";
import { FlatList } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

const Page = () => {
  const [sets, setSets] = useState<Set[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("reloaded page");
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await getSets();
      setSets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderSetRow: ListRenderItem<Set> = ({ item }) => {
    return (
      <Link href={`/(modals)/set/${item._id}`} asChild>
        <TouchableOpacity style={styles.setRow}>
          <View style={{ flexDirection: "row" ,gap:10}}>
            {item.image && (
              <Image source={{uri:item.image.url}} style={{width:50, height:50, borderRadius:8}} />
            )}
            {!item.image && <View style={{width:50, height:50}}/>}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={{color: Colors.darkGrey}}>{item.cards} Cards</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color={"#ccc"} />
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={defaultStyleSheet.container}>
      <FlatList data={sets} renderItem={renderSetRow} 
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadSets}/>}/>
    </View>
  );
};

const styles = StyleSheet.create({
    setRow:{
        padding:16,
        backgroundColor:"#fff",
        borderBottomWidth:1,
        borderBottomColor:Colors.lightGrey
    },
    rowTitle:{
        fontSize:16,
        fontWeight:500
    }
});

export default Page;
