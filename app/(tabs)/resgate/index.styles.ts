import { ScrollView, ScrollViewProps, View, ViewProps } from "react-native";
import { Card, CardProps, Button, ButtonProps, Dialog, DialogProps, } from "react-native-paper";
import styled from "styled-components/native";

export const ViewCardContainer = styled(Card.Title) <CardProps>`
  margin: 10px;
  background-color: #e7e7e794;
  border-radius: 10px;
`;

export const ViewButton = styled(Button) <ButtonProps>`
  margin: 10px;
  border-radius: 25px;
  height: 48px;
  justify-content: center;
  color: #000000;
  background-color: #f0ffff;
  
  `
export const ViewShowDialog = styled(Dialog)<DialogProps>`
  position: absolute;
  align-self: center;
  justify-content: center;
  width: 90%; /* Define largura do Dialog */
  max-height: 90%;
`;

export const DialogScrollContent = styled(ScrollView)<ScrollViewProps>`
  max-height: 80%;
`;

export const ViewScrollView = styled(ScrollView) <ScrollViewProps>` 
    flex: 1;
`;
export const CenteredView = styled.View`
  position: absolute;
  top:0;
  left:0;
  right:0;
  bottom:0;
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const ResgateContainer = styled(View)`
  background-color: #ffffff;
  padding: 15px;
  margin: 10px;
  border-radius: 10px;
`;
