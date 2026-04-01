import { Image, type ImageStyle, StyleSheet, View, type ViewStyle } from 'react-native'

type Props = {
  size?: number
  style?: ViewStyle
  imageStyle?: ImageStyle
}

/** Brand mark sourced from the web app's canonical `public/icon.png`. */
export function BrandLogo({ size = 40, style, imageStyle }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image
        source={require('../../../public/icon.png')}
        style={[styles.img, { width: size, height: size, borderRadius: size / 2 }, imageStyle]}
        accessibilityLabel="Circe et Venus"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  img: {
    resizeMode: 'cover',
  },
})
