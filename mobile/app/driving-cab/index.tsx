import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const imgHero = require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png');

export default function DrivingCabScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [landmark, setLandmark] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('driving-cab');

    const handleBook = async () => {
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert(t('service_detail.address_required'), t('service_detail.address_required_desc'));
            return;
        }
        if (!isReady) {
            Alert.alert(t('service_detail.error'), t('service_detail.init_error'));
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'driving-cab')
                : [];
            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId, cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: address,
                        landmark: landmark || undefined,
                        formDataJson: { attachments: uploadedImageUrls },
                    }),
                    amount: String(servicePrice),
                    label: serviceName || 'Driver / Cab Booking',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch {
            Alert.alert(t('service_detail.error'), t('service_detail.generic_error'));
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle={t('service_detail.driving_cab.header')}
            heroTitle={t('service_detail.driving_cab.hero')}
            heroSubtitle={t('service_detail.concierge_services')}
            description={t('service_detail.driving_cab.description')}
            heroImage={imgHero}
            pricingLabel={servicePrice > 0 ? t('service_detail.driving_cab.pricing', { price: servicePrice }) : t('service_detail.fetching_price')}
            pricingNote={t('service_detail.driving_cab.pricing_note')}
            bulletItems={[
                t('service_detail.driving_cab.bullet_1'),
                t('service_detail.driving_cab.bullet_2'),
                t('service_detail.driving_cab.bullet_3'),
                t('service_detail.driving_cab.bullet_4'),
            ]}
            address={address}
            landmark={landmark}
            onLandmarkChange={setLandmark}
            onBook={handleBook}
            isLoading={isLoading || isBooking}
        >
            <ImageUploadBox
                title={t('service_detail.driving_cab.upload_title')}
                subtitle={t('service_detail.image_upload_subtitle')}
                onImagesChange={setSelectedImages}
                maxImages={2}
            />
        </ServiceDetailScreen>
    );
}
