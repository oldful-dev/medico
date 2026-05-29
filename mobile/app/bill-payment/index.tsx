import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const imgHero = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');

export default function BillPaymentScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [landmark, setLandmark] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('bill-payment');

    const handleBook = async () => {
        if (!isReady) {
            Alert.alert(t('service_detail.error'), t('service_detail.init_error'));
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'bill-payment')
                : [];
            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId,
                        cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: 'Online / Concierge',
                        formDataJson: { billAttachments: uploadedImageUrls },
                    }),
                    amount: String(servicePrice),
                    label: serviceName || t('service_detail.bill_payment.header'),
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
            headerTitle={t('service_detail.bill_payment.header')}
            heroTitle={t('service_detail.bill_payment.hero')}
            heroSubtitle={t('service_detail.concierge_services')}
            description={t('service_detail.bill_payment.description')}
            heroImage={imgHero}
            pricingLabel={servicePrice > 0 ? t('service_detail.bill_payment.pricing', { price: servicePrice }) : t('service_detail.fetching_price')}
            pricingNote={t('service_detail.bill_payment.pricing_note')}
            bulletItems={[
                t('service_detail.bill_payment.bullet_1'),
                t('service_detail.bill_payment.bullet_2'),
                t('service_detail.bill_payment.bullet_3'),
                t('service_detail.bill_payment.bullet_4'),
            ]}
            address=""
            onBook={handleBook}
            isLoading={isLoading || isBooking}
            hideLocation={true}
        >
            <ImageUploadBox
                title={t('service_detail.bill_payment.upload_title')}
                subtitle={t('service_detail.image_upload_subtitle')}
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
