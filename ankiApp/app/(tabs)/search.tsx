import { View, Text, StyleSheet, ListRenderItem, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { Set, getSets } from "@/data/api";
import { defaultStyleSheet } from "@/constants/Styles";
import { FlatList } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

      console.log("Loading sets...");
      const data = await getSets();

      console.log("Sets loaded:", data);
      setSets(data);
    } catch (err) {
      console.error("Failed to load sets:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderSetRow: ListRenderItem<Set> = ({ item }) => {
    return (
      <Link
        href={{
          pathname: "/(modals)/set/[id]",
          params: { id: item.id },
        }}
        asChild
      >
        <TouchableOpacity style={styles.setRow}>
          <View style={{ flexDirection: "row" ,gap:10}}>
            <View style={{ flex: 1 }}>
              <Text>{item.title}</Text>
              <Text>{item.cards}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color={"#ccc"} />
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={defaultStyleSheet.container}>
      <FlatList data={sets} renderItem={renderSetRow} />
    </View>
  );
};

const styles = StyleSheet.create({
    setRow:{
        padding:16
    }
});

export default Page;
